const { FAQ, ChatHistory, NutritionCache, HardcodedResponse } = require('../models/chatbotModels');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const path = require('path');

// Initialize environment variables from root and utils
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'utils', '.env') });

// USDA API Configuration
const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';

// System instruction for Gemini: strict domain boundary, accurate nutrition guidance
const SYSTEM_INSTRUCTION = `You are NutriConnect, an expert virtual nutrition and dietary assistant.

CORE SCOPE & GUARDRAILS:
1. STRICT DOMAIN SPECIALIZATION:
- You ONLY answer questions related to food, nutrition, healthy eating, diets, meal planning, macro and micronutrients, vitamins, hydration, caloric and dietary requirements, foods for specific health conditions (e.g. diabetes, hypertension, PCOS, cholesterol, IBS, heart health, obesity, kidney stones), and NutriConnect platform features.
- If a user asks ANY question outside this scope (e.g., "what is school", general trivia, coding, history, mathematics, geography, politics, sports, entertainment, celebrity gossip, movies, unrelated science or homework), you MUST POLITELY REFUSE and redirect them.
- REFUSAL TEMPLATE:
"I am NutriConnect's nutrition assistant. I specialize only in food, diet, nutrition, meal planning, and dietary wellness. Please feel free to ask me anything related to nutrition, healthy eating, or our platform features!"
- Do NOT provide answers to off-topic questions under any circumstances, even if hypothetical or roleplay.

2. ACCURATE, DIRECT & HELPFUL ANSWERS:
- Answer the user's specific query directly, accurately, and thoroughly.
- Provide actionable, evidence-based nutrition insights in clear, accessible language.
- Use formatting (bullet points, clear paragraphs) when explaining food options or dietary plans.

3. MEDICAL & SAFETY ADVICE:
- Clearly communicate that your nutritional guidance is educational and does not constitute medical diagnosis or replace personalized medical prescriptions. Advise consulting a physician or certified dietitian for clinical medical management.`;

/**
 * Main chatbot message handler
 */
exports.sendMessage = async (req, res) => {
    try {
        const { message, sessionId, userId } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Message and sessionId are required' 
            });
        }

        const userMessage = message.trim();

        // Step 1: Check hardcoded greeting responses (pure greetings only)
        const hardcodedResponse = await checkHardcodedResponses(userMessage);
        if (hardcodedResponse) {
            await saveChatHistory(sessionId, userId, message, hardcodedResponse.response, 'hardcoded');
            return res.json({
                success: true,
                message: hardcodedResponse.response,
                source: 'hardcoded'
            });
        }

        // Step 2: Check FAQs (exact match or dedicated trigger phrases)
        const faqResponse = await checkFAQs(userMessage);
        if (faqResponse) {
            await saveChatHistory(sessionId, userId, message, faqResponse.answer, 'faq');
            return res.json({
                success: true,
                message: faqResponse.answer,
                source: 'faq'
            });
        }

        // Step 3: Check explicit nutrition/calorie lookup queries ("calories in X", etc.)
        const nutritionData = await getNutritionInfo(userMessage);
        if (nutritionData && nutritionData.foods.length > 0) {
            const nutritionResponse = formatNutritionResponse(nutritionData);
            await saveChatHistory(sessionId, userId, message, nutritionResponse.message, 'usda', nutritionData.foods);
            return res.json({
                success: true,
                message: nutritionResponse.message,
                nutritionData: nutritionData.foods,
                source: 'usda'
            });
        }

        // Step 4: Use Gemini AI with strict nutrition guardrails & conversation history
        const geminiResponse = await getGeminiResponse(userMessage, sessionId, userId);
        await saveChatHistory(sessionId, userId, message, geminiResponse, 'gemini');
        
        return res.json({
            success: true,
            message: geminiResponse,
            source: 'gemini'
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Sorry, I encountered an error. Please try again.' 
        });
    }
};

/**
 * Get top 4 most clicked FAQs
 */
exports.getTopFAQs = async (req, res) => {
    try {
        const topFAQs = await FAQ.find({ isActive: true })
            .sort({ clickCount: -1 })
            .limit(4)
            .select('question');

        const questions = topFAQs.map(faq => faq.question);

        return res.json({
            success: true,
            faqs: questions
        });
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error fetching FAQs' 
        });
    }
};

/**
 * Handle quick question click - guarantees FAQ matching and clickCount increment
 */
exports.quickQuestionClick = async (req, res) => {
    try {
        const { question, sessionId, userId } = req.body;

        if (!question) {
            return res.status(400).json({ 
                success: false, 
                message: 'Question is required' 
            });
        }

        // Find exact FAQ match for quick question
        const faq = await FAQ.findOne({ 
            question: new RegExp(`^${question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            isActive: true 
        });

        if (faq) {
            await FAQ.updateOne({ _id: faq._id }, { $inc: { clickCount: 1 } });
            
            if (sessionId) {
                await saveChatHistory(sessionId, userId, question, faq.answer, 'faq');
            }
            
            console.log('✅ Quick Question Matched:', question, '- Updated clickCount');
            
            return res.json({
                success: true,
                message: faq.answer,
                source: 'faq',
                isQuickQuestion: true
            });
        } else {
            return res.status(404).json({ 
                success: false, 
                message: 'FAQ not found' 
            });
        }
    } catch (error) {
        console.error('Error handling quick question click:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error processing quick question' 
        });
    }
};

/**
 * Get chat history for a session
 */
exports.getChatHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const chatHistory = await ChatHistory.findOne({ sessionId })
            .sort({ createdAt: -1 });

        if (!chatHistory) {
            return res.json({
                success: true,
                messages: []
            });
        }

        return res.json({
            success: true,
            messages: chatHistory.messages
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error fetching chat history' 
        });
    }
};

// ============ HELPER FUNCTIONS ============

/**
 * Check hardcoded responses (only for standalone greetings / polite phrases)
 */
async function checkHardcodedResponses(message) {
    try {
        const cleanMsg = message.trim().toLowerCase().replace(/[!.,?]+$/, '');
        
        // Exact greeting / acknowledgment matches only
        const allowedTriggers = [
            'hello', 'hi', 'hey', 'greetings', 'bye', 'goodbye', 
            'thank', 'thanks', 'thank you', 'stay healthy'
        ];
        
        if (!allowedTriggers.includes(cleanMsg)) {
            return null;
        }

        const response = await HardcodedResponse.findOne({
            trigger: cleanMsg,
            isActive: true
        });
        return response;
    } catch (error) {
        console.error('Error checking hardcoded responses:', error);
        return null;
    }
}

/**
 * Check FAQs with high precision matching (prevent hijacking unrelated queries)
 */
async function checkFAQs(message) {
    try {
        const cleanMessage = message.trim().toLowerCase().replace(/[?!.,]+$/, '');
        if (!cleanMessage) return null;

        // 1. Exact match against FAQ question (case-insensitive)
        const allFaqs = await FAQ.find({ isActive: true });
        for (const faq of allFaqs) {
            const cleanQuestion = faq.question.trim().toLowerCase().replace(/[?!.,]+$/, '');
            if (cleanQuestion === cleanMessage) {
                console.log('✅ Exact FAQ Match Found:', faq.question);
                await FAQ.updateOne({ _id: faq._id }, { $inc: { clickCount: 1 } });
                return faq;
            }
        }

        // 2. Exact match against dedicated multi-word keyword phrases
        for (const faq of allFaqs) {
            for (const kw of (faq.keywords || [])) {
                const cleanKw = kw.trim().toLowerCase();
                if (cleanKw === cleanMessage) {
                    console.log('🔑 FAQ Exact Phrase Match Found:', faq.question);
                    await FAQ.updateOne({ _id: faq._id }, { $inc: { clickCount: 1 } });
                    return faq;
                }
            }
        }

        // 3. High-confidence text search fallback for substantial queries
        if (cleanMessage.split(/\s+/).length >= 4) {
            const textMatches = await FAQ.find(
                { $text: { $search: `\"${cleanMessage}\"` }, isActive: true },
                { score: { $meta: 'textScore' } }
            )
            .sort({ score: { $meta: 'textScore' } })
            .limit(1);

            if (textMatches.length > 0 && textMatches[0].score >= 3.0) {
                const faq = textMatches[0];
                console.log('✅ FAQ High-confidence Text Match:', faq.question);
                await FAQ.updateOne({ _id: faq._id }, { $inc: { clickCount: 1 } });
                return faq;
            }
        }

        return null;
    } catch (error) {
        console.error('❌ Error checking FAQs:', error);
        return null;
    }
}

/**
 * Get nutrition info from USDA or cache
 */
async function getNutritionInfo(message) {
    try {
        // Extract food keywords specifically requested
        const foodKeywords = extractFoodKeywords(message);
        if (foodKeywords.length === 0) return null;

        const foods = [];

        for (const foodName of foodKeywords) {
            // Check cache first
            let nutritionData = await NutritionCache.findOne({ 
                foodName: foodName.toLowerCase() 
            });

            // If not in cache and USDA API is configured, fetch from USDA
            if (!nutritionData && USDA_API_KEY) {
                nutritionData = await fetchFromUSDA(foodName);
                if (nutritionData) {
                    await NutritionCache.create(nutritionData);
                }
            }

            if (nutritionData) {
                foods.push({
                    foodName: nutritionData.foodName,
                    nutrients: nutritionData.nutrients
                });
            }
        }

        return foods.length > 0 ? { foods } : null;
    } catch (error) {
        console.error('Error getting nutrition info:', error);
        return null;
    }
}

/**
 * Extract food-related keywords ONLY when user explicitly asks for nutrition facts or calories
 */
function extractFoodKeywords(message) {
    const nutritionKeywords = [
        'how many calories in',
        'calories in',
        'nutritional value of',
        'nutrients in',
        'nutrition of',
        'nutrition facts of',
        'how much protein in',
        'macros of',
        'how much fat in'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    // Check if message contains explicit nutrition triggers
    const matchedTrigger = nutritionKeywords.find(keyword => lowerMessage.includes(keyword));
    
    if (matchedTrigger) {
        let foodName = lowerMessage.replace(matchedTrigger, '').trim();
        foodName = foodName.replace(/[?!.]+$/, '').replace(/^(a|an|the)\s+/, '').trim();
        
        if (foodName && foodName.length > 1) {
            return [foodName];
        }
    }
    
    // Do NOT fallback to generic common foods list so normal dietary questions are not hijacked
    return [];
}

/**
 * Fetch nutrition data from USDA API
 */
async function fetchFromUSDA(foodName) {
    try {
        const response = await axios.get(`${USDA_API_URL}/foods/search`, {
            params: {
                api_key: USDA_API_KEY,
                query: foodName,
                pageSize: 1
            }
        });

        if (response.data.foods && response.data.foods.length > 0) {
            const food = response.data.foods[0];
            const nutrients = food.foodNutrients || [];

            const nutrientData = {
                calories: nutrients.find(n => n.nutrientName === "Energy")?.value || 0,
                protein: nutrients.find(n => n.nutrientName === "Protein")?.value || 0,
                carbs: nutrients.find(n => n.nutrientName === "Carbohydrate, by difference")?.value || 0,
                fat: nutrients.find(n => n.nutrientName.toLowerCase().includes("fat"))?.value || 0
            };

            return {
                foodName: food.description,
                usdaFdcId: food.fdcId.toString(),
                nutrients: {
                    calories: Math.round(nutrientData.calories),
                    protein: Math.round(nutrientData.protein * 10) / 10,
                    carbs: Math.round(nutrientData.carbs * 10) / 10,
                    fat: Math.round(nutrientData.fat * 10) / 10
                },
                source: 'usda'
            };
        }
        return null;
    } catch (error) {
        console.error('USDA API error:', error.message);
        return null;
    }
}

/**
 * Format nutrition response message
 */
function formatNutritionResponse(nutritionData) {
    const foodList = nutritionData.foods.map(f => f.foodName).join(', ');
    return {
        message: `Here's the nutritional information for ${foodList}. Check the cards below for details!`
    };
}

/**
 * Get response from Gemini AI with strict guardrails and session history
 */
async function getGeminiResponse(message, sessionId, userId) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('Gemini API key is not configured');
            return "I am NutriConnect's nutrition assistant. I can help answer questions on food, diet, nutrition, meal planning, and our platform features. How can I assist you today?";
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            systemInstruction: SYSTEM_INSTRUCTION
        });

        // Load conversation history if sessionId is provided
        let history = [];
        if (sessionId) {
            try {
                const chatDoc = await ChatHistory.findOne({ sessionId });
                if (chatDoc && chatDoc.messages && chatDoc.messages.length > 0) {
                    const recentMessages = chatDoc.messages.slice(-8);
                    
                    for (const m of recentMessages) {
                        if (m.type === 'user' && m.content) {
                            history.push({
                                role: 'user',
                                parts: [{ text: m.content }]
                            });
                        } else if (m.type === 'bot' && m.content) {
                            history.push({
                                role: 'model',
                                parts: [{ text: m.content }]
                            });
                        }
                    }

                    // Gemini history must start with role 'user'
                    while (history.length > 0 && history[0].role !== 'user') {
                        history.shift();
                    }

                    // Remove consecutive messages with same role to ensure alternation
                    const sanitizedHistory = [];
                    for (let i = 0; i < history.length; i++) {
                        if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === history[i].role) {
                            sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += `\n${history[i].parts[0].text}`;
                        } else {
                            sanitizedHistory.push(history[i]);
                        }
                    }
                    history = sanitizedHistory;
                }
            } catch (err) {
                console.warn('Could not load chat history for Gemini:', err.message);
                history = [];
            }
        }

        if (history.length > 0) {
            const chat = model.startChat({ history });
            const result = await chat.sendMessage(message);
            const response = await result.response;
            return response.text();
        } else {
            const result = await model.generateContent(message);
            const response = await result.response;
            return response.text();
        }
    } catch (error) {
        console.error('Gemini AI error:', error);
        return "I am NutriConnect's nutrition assistant. I can help answer questions on food, diet, nutrition, meal planning, and our platform features. How can I assist you today?";
    }
}

/**
 * Save chat history to database
 */
async function saveChatHistory(sessionId, userId, userMessage, botMessage, source, nutritionData = null) {
    try {
        const messages = [
            {
                type: 'user',
                content: userMessage,
                timestamp: new Date()
            },
            {
                type: 'bot',
                content: botMessage,
                timestamp: new Date(),
                nutritionData: nutritionData,
                source: source
            }
        ];

        await ChatHistory.findOneAndUpdate(
            { sessionId },
            {
                $push: { messages: { $each: messages } },
                $set: { userId: userId || null }
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}
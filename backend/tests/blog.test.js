require('./setup');
const mongoose = require('mongoose');
const { Blog } = require('../src/models/blogModel');

// ============================================================
// BLOG MODEL TESTS
// ============================================================

const createValidBlog = (overrides = {}) => ({
  title: 'Healthy Eating Tips for Modern Students',
  content: 'This is a detailed blog post about healthy eating habits for students. It covers nutrition basics, meal planning strategies, and budget-friendly options to maintain a balanced diet throughout the academic year. Eating right helps improve focus and energy levels.',
  category: 'Nutrition Tips',
  author: {
    userId: new mongoose.Types.ObjectId(),
    name: 'Dr. Sarah Johnson',
    role: 'dietitian'
  },
  ...overrides
});

describe('Blog Model - Creation', () => {
  test('should create a valid blog post', async () => {
    const blog = await Blog.create(createValidBlog());

    expect(blog._id).toBeDefined();
    expect(blog.title).toBe('Healthy Eating Tips for Modern Students');
    expect(blog.category).toBe('Nutrition Tips');
    expect(blog.author.name).toBe('Dr. Sarah Johnson');
    expect(blog.author.role).toBe('dietitian');
    expect(blog.isPublished).toBe(true);
    expect(blog.status).toBe('active');
    expect(blog.views).toBe(0);
    expect(blog.likesCount).toBe(0);
    expect(blog.commentsCount).toBe(0);
    expect(blog.createdAt).toBeDefined();
  });

  test('should auto-generate excerpt from content if not provided', async () => {
    const blog = await Blog.create(createValidBlog());
    expect(blog.excerpt).toBeDefined();
    expect(blog.excerpt.length).toBeGreaterThan(0);
    expect(blog.excerpt.length).toBeLessThanOrEqual(203); // 200 + '...'
  });

  test('should use provided excerpt if given', async () => {
    const blog = await Blog.create(createValidBlog({
      excerpt: 'A short summary of the blog post.'
    }));
    expect(blog.excerpt).toBe('A short summary of the blog post.');
  });

  test('should set default values correctly', async () => {
    const blog = await Blog.create(createValidBlog());
    expect(blog.isPublished).toBe(true);
    expect(blog.status).toBe('active');
    expect(blog.views).toBe(0);
    expect(blog.isReported).toBe(false);
    expect(blog.likes).toHaveLength(0);
    expect(blog.comments).toHaveLength(0);
    expect(blog.reports).toHaveLength(0);
  });
});

describe('Blog Model - Validation', () => {
  test('should reject blog with title shorter than 5 characters', async () => {
    await expect(Blog.create(createValidBlog({ title: 'Hi' })))
      .rejects.toThrow();
  });

  test('should reject blog with title longer than 200 characters', async () => {
    await expect(Blog.create(createValidBlog({ title: 'A'.repeat(201) })))
      .rejects.toThrow();
  });

  test('should reject blog with content shorter than 50 characters', async () => {
    await expect(Blog.create(createValidBlog({ content: 'Short content' })))
      .rejects.toThrow();
  });

  test('should reject blog without title', async () => {
    const data = createValidBlog();
    delete data.title;
    await expect(Blog.create(data)).rejects.toThrow();
  });

  test('should reject blog without content', async () => {
    const data = createValidBlog();
    delete data.content;
    await expect(Blog.create(data)).rejects.toThrow();
  });

  test('should reject blog without category', async () => {
    const data = createValidBlog();
    delete data.category;
    await expect(Blog.create(data)).rejects.toThrow();
  });

  test('should reject blog with invalid category', async () => {
    await expect(Blog.create(createValidBlog({ category: 'Cooking Shows' })))
      .rejects.toThrow();
  });

  test('should reject blog with invalid author role', async () => {
    await expect(Blog.create(createValidBlog({
      author: {
        userId: new mongoose.Types.ObjectId(),
        name: 'Admin User',
        role: 'admin'
      }
    }))).rejects.toThrow();
  });
});

describe('Blog Model - Categories', () => {
  const validCategories = [
    'Nutrition Tips',
    'Weight Management',
    'Healthy Recipes',
    'Fitness & Exercise',
    'Mental Health & Wellness',
    'Disease Management'
  ];

  test.each(validCategories)(
    'should accept valid category: %s',
    async (category) => {
      const blog = await Blog.create(createValidBlog({ category }));
      expect(blog.category).toBe(category);
    }
  );
});

describe('Blog Model - Tags', () => {
  test('should save tags as array', async () => {
    const blog = await Blog.create(createValidBlog({
      tags: ['nutrition', 'health', 'diet']
    }));
    expect(blog.tags).toHaveLength(3);
    expect(blog.tags).toContain('nutrition');
  });

  test('should allow blog without tags', async () => {
    const blog = await Blog.create(createValidBlog());
    expect(blog.tags).toHaveLength(0);
  });
});

describe('Blog Model - Likes', () => {
  test('should track likes count correctly', async () => {
    const blog = await Blog.create(createValidBlog());

    blog.likes.push({ userId: new mongoose.Types.ObjectId() });
    blog.likes.push({ userId: new mongoose.Types.ObjectId() });
    blog.likes.push({ userId: new mongoose.Types.ObjectId() });
    await blog.save();

    expect(blog.likesCount).toBe(3);
  });

  test('should start with zero likes', async () => {
    const blog = await Blog.create(createValidBlog());
    expect(blog.likesCount).toBe(0);
    expect(blog.likes).toHaveLength(0);
  });

  test('should update count after removing a like', async () => {
    const blog = await Blog.create(createValidBlog());

    const userId1 = new mongoose.Types.ObjectId();
    const userId2 = new mongoose.Types.ObjectId();
    blog.likes.push({ userId: userId1 });
    blog.likes.push({ userId: userId2 });
    await blog.save();
    expect(blog.likesCount).toBe(2);

    // Remove one like
    blog.likes = blog.likes.filter(l => l.userId.toString() !== userId1.toString());
    await blog.save();
    expect(blog.likesCount).toBe(1);
  });
});

describe('Blog Model - Comments', () => {
  test('should add comments and update count', async () => {
    const blog = await Blog.create(createValidBlog());

    blog.comments.push({
      userId: new mongoose.Types.ObjectId(),
      userName: 'Commenter One',
      userRole: 'user',
      content: 'Great article! Very helpful.'
    });
    await blog.save();

    expect(blog.commentsCount).toBe(1);
    expect(blog.comments[0].userName).toBe('Commenter One');
    expect(blog.comments[0].createdAt).toBeDefined();
  });

  test('should support multiple comments', async () => {
    const blog = await Blog.create(createValidBlog());

    for (let i = 0; i < 5; i++) {
      blog.comments.push({
        userId: new mongoose.Types.ObjectId(),
        userName: `User ${i + 1}`,
        userRole: 'user',
        content: `Comment number ${i + 1} with enough content.`
      });
    }
    await blog.save();

    expect(blog.commentsCount).toBe(5);
  });
});

describe('Blog Model - Reports', () => {
  test('should track reports and update isReported flag', async () => {
    const blog = await Blog.create(createValidBlog());

    blog.reports.push({
      reportedBy: new mongoose.Types.ObjectId(),
      reporterName: 'Reporter One',
      reason: 'Inappropriate content'
    });
    await blog.save();

    expect(blog.isReported).toBe(true);
    expect(blog.reports).toHaveLength(1);
  });

  test('should not be flagged with zero reports', async () => {
    const blog = await Blog.create(createValidBlog());
    expect(blog.isReported).toBe(false);
  });
});

describe('Blog Model - Virtual & Middleware', () => {
  test('should generate correct author label for dietitian', async () => {
    const blog = await Blog.create(createValidBlog({
      author: {
        userId: new mongoose.Types.ObjectId(),
        name: 'Dr. Expert',
        role: 'dietitian'
      }
    }));
    expect(blog.authorLabel).toBe('Dietitian');
  });

  test('should generate correct author label for user', async () => {
    const blog = await Blog.create(createValidBlog({
      author: {
        userId: new mongoose.Types.ObjectId(),
        name: 'Regular User',
        role: 'user'
      }
    }));
    expect(blog.authorLabel).toBe('Client');
  });

  test('should strip HTML tags from excerpt', async () => {
    const blog = await Blog.create(createValidBlog({
      content: '<h1>Title</h1><p>This is a detailed blog post about healthy eating. It covers nutrition basics and meal planning strategies and budget-friendly options.</p>',
      excerpt: undefined
    }));

    expect(blog.excerpt).not.toContain('<h1>');
    expect(blog.excerpt).not.toContain('<p>');
    expect(blog.excerpt).not.toContain('</');
  });
});


// 1. Title Too Short
test('CI Fail: blog title minimum length enforced', async () => {
  await expect(Blog.create(createValidBlog({ title: 'Hi' })))
    .rejects.toThrow(); // ValidationError: title min 5 chars
});

// 2. Content Too Short
test('CI Fail: blog content minimum length enforced', async () => {
  await expect(Blog.create(createValidBlog({ content: 'Too short' })))
    .rejects.toThrow(); // ValidationError: content min 50 chars
});

// 3. Missing Required Category
test('CI Fail: category field is required', async () => {
  const data = createValidBlog();
  delete data.category;
  await expect(Blog.create(data))
    .rejects.toThrow(); // ValidationError: category required
});

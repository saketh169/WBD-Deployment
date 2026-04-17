import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from '../../axios';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

// --- Color constants for UI consistency ---
const primaryGreen = '#1E6F5C';
const lightGreen = '#6a994e';

// --- Global UI constants (used in final render) ---
const commonLinkClasses = 'text-[#1E6F5C] hover:text-[#155345] font-medium transition-colors duration-300';

// --- Role-based redirection routes ---
const roleRoutes = {
    user: '/user/home',
    admin: '/admin/home',
    organization: '/organization/home',
    dietitian: '/dietitian/home',
};

// --- Formik & Yup Validation Schema Builder ---
const buildValidationSchema = (role, orgType = '') => {
    // Base schema for all roles
    let schema = Yup.object().shape({
        email: Yup.string()
            .matches(
                /^[a-zA-Z][a-zA-Z0-9._]{2,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                'Invalid email address.'
            )
            .required('Email is required.')
            .min(5, 'Email must be at least 5 characters.')
            .max(50, 'Email must not exceed 50 characters.'),
        password: Yup.string()
            .required('Password is required.')
            .min(6, 'Password must be at least 6 characters.')
            .max(20, 'Password must not exceed 20 characters.'),
        rememberMe: Yup.boolean(),
    });

    // Role-specific field additions and conditional validation
    switch (role) {
        case 'dietitian':
            schema = schema.shape({
                licenseNumber: Yup.string()
                    .required('License Number is required.')
                    .matches(
                        /^DLN[0-9]{6}$/,
                        'License Number format is incorrect (e.g., DLN123456).'
                    )
                    .length(9, 'License Number must be 9 characters (e.g., DLN123456).'),
            });
            break;

        case 'organization':
            if (orgType !== 'employee') {
                schema = schema.shape({
                    licenseNumber: Yup.string()
                        .required('License Number is required.')
                        .min(5, 'License Number must be at least 5 characters.')
                        .max(20, 'License Number must not exceed 20 characters.'),
                });
            } else {
                // Employee: 3 uppercase org letters + 6 digits e.g. APO123456
                schema = schema.shape({
                    licenseNumber: Yup.string()
                        .required('Employee License Number is required.')
                        .matches(
                            /^[A-Z]{3}[0-9]{6}$/,
                            'Format must be 3 uppercase org letters + 6 digits (e.g. APO123456).'
                        )
                        .length(9, 'Employee License Number must be exactly 9 characters.'),
                });
            }
            break;


        case 'admin':
            schema = schema.shape({
                adminKey: Yup.string()
                    .required('Admin Key is required.')
                    .min(5, 'Admin Key must be at least 5 characters.')
                    .max(20, 'Admin Key must not exceed 20 characters.'),
            });
            break;

        default:
            break;
    }

    return schema;
};

// --- Initial Form Values Based on Role ---
// Always include ALL possible fields so no Field ever transitions from undefined to a value.
// Formik ignores values with no matching <Field> — unused keys are harmless.
const getInitialValues = () => ({
    email: '',
    password: '',
    rememberMe: false,
    licenseNumber: '',  // used by dietitian & organization
    adminKey: '',       // used by admin
});


// --- Main Component ---
const Signin = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [role, setRole] = useState('');
    const [orgType, setOrgType] = useState(''); // 'management' or 'employee'
    const [message, setMessage] = useState('');

    // 2FA State
    const [currentStep, setCurrentStep] = useState('credentials'); // 'credentials' or 'otp'
    const [twoFAEmail, setTwoFAEmail] = useState('');
    const [twoFARememberMe, setTwoFARememberMe] = useState(false);

    // Get role from URL on mount
    useEffect(() => {
        const roleFromUrl = searchParams.get('role') || 'user';
        const typeFromUrl = searchParams.get('type') || '';
        setRole(roleFromUrl);
        setOrgType(typeFromUrl);
    }, [searchParams]);

    // Define the Formik submission handler
    const handleFormikSubmit = async (values, { setSubmitting, setErrors }) => {

        // Construct the API payload object
        const formData = {
            email: values.email,
            password: values.password,
            rememberMe: values.rememberMe,
            role: role,
        };

        // Map role-specific fields to the API payload
        if (role === 'dietitian') formData.licenseNumber = values.licenseNumber;
        if (role === 'organization') {
            formData.orgType = orgType;
            formData.licenseNumber = values.licenseNumber; // required for both management and employee
        }
        if (role === 'admin') formData.adminKey = values.adminKey;

        const apiRoute = `/api/signin/${role}`; // e.g., /api/signin/user

        setSubmitting(true);
        setMessage('Verifying credentials...');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        try {
            const response = await axios.post(apiRoute, formData);
            const data = response.data;

            // Check if 2FA is required
            if (data.requires2FA) {
                setTwoFAEmail(data.email);
                setTwoFARememberMe(values.rememberMe || false);
                setMessage('OTP sent to your email! Please check your inbox.');
                setCurrentStep('otp');

                setTimeout(() => {
                    setMessage('');
                }, 3000);
            } else if (data.token) {
                // Direct login (fallback if 2FA not required)
                const storageRole = (data.role === 'organization' && data.orgType === 'employee')
                    ? 'employee'
                    : data.role;

                localStorage.setItem(`authToken_${storageRole}`, data.token);
                const existingUser = JSON.parse(localStorage.getItem(`authUser_${storageRole}`) || '{}');
                const userUpdate = { ...existingUser };
                if (data.orgType) userUpdate.orgType = data.orgType;
                if (data.name)    userUpdate.name  = data.name;
                if (data.email)   userUpdate.email = data.email;
                if (data.roleId) userUpdate.id = data.roleId;
                localStorage.setItem(`authUser_${storageRole}`, JSON.stringify(userUpdate));

                setMessage(`Sign-in successful! Redirecting...`);

                setTimeout(() => {
                    setMessage('');
                    if (role === 'organization' && (orgType === 'employee' || data.orgType === 'employee')) {
                        navigate('/employee/home');
                    } else {
                        navigate(roleRoutes[role]);
                    }
                }, 1000);
            }

        } catch (error) {
            console.error('Sign-in Error:', error.response ? error.response.data : error.message);

            const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
            setMessage(`Error: ${errorMessage}`);

            const backendErrors = error.response?.data?.errors;
            if (backendErrors) {
                setErrors(backendErrors);
            }

        } finally {
            setSubmitting(false);
        }
    };

    // 2FA OTP submission handler
    const handleOTPSubmit = async (values, { setSubmitting }) => {
        setSubmitting(true);
        setMessage('Verifying OTP...');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        try {
            const response = await axios.post(`/api/verify-login-otp/${role}`, {
                email: twoFAEmail,
                otp: values.otp,
                rememberMe: twoFARememberMe,
                orgType: orgType,
            });

            const data = response.data;

            if (data.token) {
                const storageRole = (data.role === 'organization' && data.orgType === 'employee')
                    ? 'employee'
                    : data.role;

                localStorage.setItem(`authToken_${storageRole}`, data.token);
                const existingUser = JSON.parse(localStorage.getItem(`authUser_${storageRole}`) || '{}');
                const userUpdate = { ...existingUser };
                if (data.orgType) userUpdate.orgType = data.orgType;
                if (data.name)    userUpdate.name  = data.name;
                if (data.email)   userUpdate.email = data.email;
                if (data.roleId) userUpdate.id = data.roleId;
                localStorage.setItem(`authUser_${storageRole}`, JSON.stringify(userUpdate));

                setMessage('Sign-in successful! Redirecting...');

                setTimeout(() => {
                    setMessage('');
                    if (role === 'organization' && (orgType === 'employee' || data.orgType === 'employee')) {
                        navigate('/employee/home');
                    } else {
                        navigate(roleRoutes[role]);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('OTP Verification Error:', error.response ? error.response.data : error.message);
            const errorMessage = error.response?.data?.message || 'OTP verification failed. Please try again.';
            setMessage(`Error: ${errorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Resend OTP handler
    const handleResendOTP = async () => {
        setMessage('Resending OTP...');
        try {
            await axios.post('/api/resend-login-otp', { email: twoFAEmail, role: role });
            setMessage('A new OTP has been sent to your email!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Resend OTP Error:', error.response ? error.response.data : error.message);
            setMessage('Error: Failed to resend OTP. Please try again.');
        }
    };

    // Render Form Content (Role-agnostic components)
    const renderFormFields = () => {
        const commonInputClasses = `w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[${lightGreen}] transition-all duration-300`;
        const errorClasses = 'text-red-500 text-xs mt-1';

        // Function to generate the name/id for Field and ErrorMessage
        const getFieldIdAndName = (type) => type;

        const renderInputGroup = (type, label, placeholder, fieldName, isRequired = true) => (
            <div className="relative">
                <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <Field
                    id={fieldName}
                    name={fieldName}
                    type={type}
                    className={`${commonInputClasses} h-11`}
                    placeholder={placeholder}
                    required={isRequired}
                />
                <ErrorMessage name={fieldName} component="div" className={errorClasses} />
            </div>
        );

        const RememberMe = () => (
            <div className="flex items-center">
                <Field
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    className={`h-4 w-4 text-[${primaryGreen}] border-gray-300 rounded focus:ring-[${primaryGreen}]`}
                />
                <label className="ml-2 block text-sm text-gray-900" htmlFor="rememberMe">
                    Remember Me
                </label>
            </div>
        );

        // --- Dynamic Fields ---
        const renderRoleFields = () => {
            if (role === 'dietitian') {
                return <div key="roleField">{renderInputGroup('text', 'License Number', 'e.g., DLN123456', getFieldIdAndName('licenseNumber'))}</div>;
            } else if (role === 'organization' && orgType !== 'employee') {
                return <div key="roleField">{renderInputGroup('text', 'License Number', 'Enter your License Number', getFieldIdAndName('licenseNumber'))}</div>;
            } else if (role === 'organization' && orgType === 'employee') {
                return <div key="roleField">{renderInputGroup('text', 'Employee License Number', 'e.g. APO123456', getFieldIdAndName('licenseNumber'))}</div>;
            } else if (role === 'admin') {
                return <div key="roleField">{renderInputGroup('password', 'Admin Key', 'Enter Admin Key', getFieldIdAndName('adminKey'))}</div>;
            }
            return null;
        };

        return (
            <>
                {/* Email */}
                {renderInputGroup('email', 'Email', 'Enter your email', getFieldIdAndName('email'))}

                {/* Password */}
                {renderInputGroup('password', 'Password', 'Enter your password', getFieldIdAndName('password'))}

                {/* Role-Specific Field(s) */}
                {renderRoleFields()}
                <div className="flex items-center justify-between">
                    <RememberMe />
                    <Link to={`/forgot-password?role=${role}`} className="text-sm font-medium text-[#1E6F5C] hover:text-[#155345]">
                        Forgot Password?
                    </Link>
                </div>
            </>
        );
    };

    // Fallback for unselected role
    if (!role || role === 'default') {
        return (
            <section className="flex items-center justify-center bg-gray-100 p-4 min-h-150">
                <div className="w-full max-w-lg p-8 mx-auto rounded-3xl shadow-2xl bg-white animate-fade-in">
                    <div className="text-center p-8">
                        <h3 className="text-xl text-gray-700 font-semibold mb-4">Please select a role to sign in.</h3>
                        <button
                            onClick={() => navigate('/role')}
                            className="mt-4 bg-[#28B463] hover:bg-[#1E8449] text-white font-bold py-2 px-4 rounded-md shadow-lg transition-colors"
                        >
                            Select a Role
                        </button>
                    </div>
                </div>
            </section>
        );
    }


    // Main Render with Formik Wrapper
    return (
        <section className="flex items-center justify-center bg-gray-100 p-4 min-h-150">
            <div className="w-full max-w-lg p-8 mx-auto rounded-3xl shadow-2xl bg-white animate-fade-in relative">
                <button
                    onClick={() => {
                        if (currentStep === 'otp') {
                            setCurrentStep('credentials');
                            setMessage('');
                        } else {
                            navigate('/role');
                        }
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                    title={currentStep === 'otp' ? 'Back to Credentials' : 'Back to Role Selection'}
                >
                    <i className={`fas ${currentStep === 'otp' ? 'fa-arrow-left' : 'fa-times'} text-xl`}></i>
                </button>

                {currentStep === 'otp' ? (
                    <>
                        <div className="text-center mb-6">
                            <i className="fas fa-shield-alt text-4xl text-[#1E6F5C] mb-4"></i>
                            <h2 className="text-3xl font-bold text-[#1E6F5C]">
                                Verify Your Identity
                            </h2>
                            <p className="text-gray-600 mt-2">
                                Two-Factor Authentication
                            </p>
                        </div>
                    </>
                ) : (
                    <h2 className="text-center text-3xl font-bold text-[#1E6F5C] mb-6">
                        LOG IN AS {role === 'organization' && orgType ? `ORGANIZATION - ${orgType.toUpperCase()}` : role.toUpperCase()}
                    </h2>
                )}

                {/* Global Alert */}
                {message && (
                    <div
                        aria-live="polite"
                        className={`p-3 mb-5 text-center text-base font-medium rounded-lg shadow-sm animate-slide-in w-full ${message.includes('successful') || message.includes('Redirecting') || message.includes('OTP sent') || message.includes('new OTP')
                                ? 'text-green-800 bg-green-100 border border-green-300'
                                : message.includes('Verifying') || message.includes('Resending')
                                    ? 'text-blue-800 bg-blue-100 border border-blue-300'
                                    : 'text-red-800 bg-red-100 border border-red-300'
                            }`}
                        role="alert"
                    >
                        {message}
                    </div>
                )}

                {currentStep === 'otp' ? (
                    /* ========== 2FA OTP FORM ========== */
                    <Formik
                        initialValues={{ otp: '' }}
                        validationSchema={Yup.object().shape({
                            otp: Yup.string()
                                .required('OTP is required.')
                                .length(6, 'OTP must be 6 digits.')
                                .matches(/^[0-9]+$/, 'OTP must contain only numbers.'),
                        })}
                        onSubmit={handleOTPSubmit}
                    >
                        {({ isSubmitting }) => (
                            <Form className="space-y-4" noValidate>
                                {/* Email Display */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <i className="fas fa-envelope mr-2"></i>
                                        OTP sent to: <span className="font-medium text-gray-800">{twoFAEmail}</span>
                                    </p>
                                </div>

                                {/* OTP Input */}
                                <div className="relative">
                                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                                        Enter OTP
                                    </label>
                                    <Field
                                        id="otp"
                                        name="otp"
                                        type="text"
                                        className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[${lightGreen}] transition-all duration-300 h-11 text-center text-lg tracking-widest`}
                                        placeholder="000000"
                                        maxLength="6"
                                        autoFocus
                                    />
                                    <ErrorMessage name="otp" component="div" className="text-red-500 text-xs mt-1" />
                                </div>

                                <div className="text-sm text-gray-600">
                                    <p>Enter the 6-digit code sent to your email to complete sign-in.</p>
                                </div>

                                {/* Verify OTP Button */}
                                <button
                                    type="submit"
                                    className={`w-full bg-[${primaryGreen}] text-white font-semibold py-3 rounded-lg hover:bg-[#155345] transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50`}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i> Verifying...
                                        </>
                                    ) : (
                                        'Verify & Log In'
                                    )}
                                </button>

                                <div className="text-center mt-4 space-y-2">
                                    <p className="text-sm">
                                        Didn't receive OTP?{' '}
                                        <button
                                            type="button"
                                            onClick={handleResendOTP}
                                            className={commonLinkClasses}
                                        >
                                            Resend OTP
                                        </button>
                                    </p>
                                    <p className="text-sm">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCurrentStep('credentials');
                                                setMessage('');
                                            }}
                                            className={commonLinkClasses}
                                        >
                                            Back to Sign In
                                        </button>
                                    </p>
                                </div>
                            </Form>
                        )}
                    </Formik>
                ) : (
                    /* ========== CREDENTIALS FORM ========== */
                    <Formik
                        initialValues={getInitialValues()}
                        validationSchema={buildValidationSchema(role, orgType)}
                        onSubmit={handleFormikSubmit}
                        enableReinitialize={true}
                    >
                        {({ isSubmitting }) => (
                            <Form className="space-y-4" noValidate>

                                {renderFormFields()}

                                {/* Submit Button with Loading State */}
                                <button
                                    type="submit"
                                    className={`w-full bg-[${primaryGreen}] text-white font-semibold py-3 rounded-lg hover:bg-[#155345] transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50`}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i> Verifying Credentials...
                                        </>
                                    ) : (
                                        'Continue'
                                    )}
                                </button>

                                <p className="text-center text-sm mt-4">
                                    Don't have an account?{' '}
                                    <Link to={`/signup?role=${role}`} className={commonLinkClasses}>Sign Up</Link>
                                </p>
                            </Form>
                        )}
                    </Formik>
                )}
            </div>
        </section>
    );
};

export default Signin;
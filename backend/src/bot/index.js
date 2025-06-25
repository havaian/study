const { Bot, session, GrammyError, HttpError } = require('grammy');
const axios = require('axios');

// Create bot instance with validation
const bot = process.env.TELEGRAM_BOT_TOKEN
    ? new Bot(process.env.TELEGRAM_BOT_TOKEN)
    : null;

if (!bot) {
    console.error('TELEGRAM_BOT_TOKEN is not defined. Telegram bot functionality will be disabled.');
}

// Middleware
if (bot) {
    // Set up session middleware with better initial state
    bot.use(session({
        initial: () => ({
            step: 'idle',
            userData: {
                userId: null,
                token: null,
                email: null
            },
            verificationCode: null,
            appointmentData: {}
        }),
        // Add storage option for production environments
        // storage: process.env.NODE_ENV === 'production' ? new RedisStorage(...) : undefined
    }));

    // Error handling middleware
    bot.catch((err) => {
        const ctx = err.ctx;
        console.error(`Error while handling update ${ctx.update.update_id}:`);

        if (err instanceof GrammyError) {
            console.error("Error in request:", err.description);
            // Notify user of the error
            try {
                ctx.reply("Sorry, there was an error processing your request. Please try again later.");
            } catch (replyError) {
                console.error("Could not send error message to user:", replyError);
            }
        } else if (err instanceof HttpError) {
            console.error("Could not contact Telegram:", err);
        } else {
            console.error("Unknown error:", err);
        }
    });

    // Welcome message
    bot.command("start", async (ctx) => {
        try {
            await ctx.reply(
                "👋 Welcome to E-polyclinic.uz bot!\n\n" +
                "I can help you manage your medical appointments and consultations.\n\n" +
                "Here's what you can do:\n" +
                "- Link your E-polyclinic.uz account\n" +
                "- View your upcoming appointments\n" +
                "- Get reminders for consultations\n" +
                "- Chat with virtual medical assistant\n\n" +
                "To begin, please use the /link command to connect your E-polyclinic.uz account."
            );
        } catch (error) {
            console.error("Error in start command:", error);
        }
    });

    // Help command
    bot.command("help", async (ctx) => {
        try {
            await ctx.reply(
                "🙋‍♂️ Available commands:\n\n" +
                "/start - Start the bot\n" +
                "/link - Link your E-polyclinic.uz account\n" +
                "/appointments - View your appointments\n" +
                "/profile - View your profile\n" +
                "/unlink - Unlink your account\n" +
                "/assistant - Chat with medical assistant\n\n" +
                "If you need further assistance, contact support@e-polyclinic.uz"
            );
        } catch (error) {
            console.error("Error in help command:", error);
        }
    });

    // Link account command
    bot.command("link", async (ctx) => {
        try {
            // Initialize or reset session state
            ctx.session.step = 'link_email';
            ctx.session.userData = ctx.session.userData || {};

            await ctx.reply(
                "To link your E-polyclinic.uz account, I'll need your email address.\n\n" +
                "Please enter the email you used to register on E-polyclinic.uz:"
            );
        } catch (error) {
            console.error("Error in link command:", error);
            ctx.reply("Sorry, there was an error processing your request. Please try again later.");
        }
    });

    // Handle email input for linking
    bot.on("message:text", async (ctx) => {
        try {
            // Initialize session if not exists
            if (!ctx.session) {
                ctx.session = {
                    step: 'idle',
                    userData: {},
                    verificationCode: null,
                    appointmentData: {}
                };
            }

            if (ctx.session.step === 'link_email') {
                const email = ctx.message.text.trim();

                // Email validation
                const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
                if (!emailRegex.test(email)) {
                    await ctx.reply("⚠️ Please enter a valid email address.");
                    return;
                }

                try {
                    // Validate API_URL is set
                    if (!process.env.API_URL) {
                        throw new Error('API_URL environment variable is not set');
                    }

                    // Request verification code from API
                    const response = await axios.post(
                        `${process.env.API_URL}/users/telegram-verification`,
                        { email, telegramChatId: ctx.chat.id }
                    );

                    if (response.data.success) {
                        ctx.session.step = 'link_verification';
                        ctx.session.userData.email = email;

                        await ctx.reply(
                            "📧 We've sent a verification code to your email.\n\n" +
                            "Please enter the code you received to link your account:"
                        );
                    }
                } catch (error) {
                    console.error('Error requesting verification code:', error.response?.data || error.message);
                    
                    // Specific error messages based on the error
                    if (error.response?.status === 404) {
                        await ctx.reply("❌ Email not found. Please make sure your email is registered with E-polyclinic.uz.");
                    } else if (error.message.includes('API_URL environment variable')) {
                        await ctx.reply("❌ System configuration error. Please contact support.");
                        console.error(error.message);
                    } else {
                        await ctx.reply(
                            "❌ Failed to send verification code. Please try again later or contact support if the problem persists."
                        );
                    }
                    
                    ctx.session.step = 'idle';
                }
            } else if (ctx.session.step === 'link_verification') {
                const verificationCode = ctx.message.text.trim();

                try {
                    // Validate API_URL is set
                    if (!process.env.API_URL) {
                        throw new Error('API_URL environment variable is not set');
                    }

                    // Verify the code with API
                    const response = await axios.post(
                        `${process.env.API_URL}/users/link-telegram`,
                        {
                            telegramId: ctx.chat.id.toString(),
                            verificationCode
                        }
                    );

                    if (response.data.message === 'Telegram account linked successfully') {
                        await ctx.reply(
                            "🎉 Your E-polyclinic.uz account has been successfully linked!\n\n" +
                            "You'll now receive notifications about your appointments and consultations.\n\n" +
                            "Use /appointments to view your upcoming appointments or /help to see all available commands."
                        );

                        ctx.session.step = 'idle';
                    }
                } catch (error) {
                    console.error('Error verifying code:', error.response?.data || error.message);
                    
                    // More specific error message
                    if (error.response?.status === 400) {
                        await ctx.reply(
                            "❌ Invalid or expired verification code. Please check the code and try again, or use /link to request a new code."
                        );
                    } else if (error.message.includes('API_URL environment variable')) {
                        await ctx.reply("❌ System configuration error. Please contact support.");
                        console.error(error.message);
                    } else {
                        await ctx.reply(
                            "❌ An error occurred while verifying your code. Please try again later or contact support."
                        );
                    }
                }
            } else if (ctx.session.step === 'appointment_reason') {
                // Validate session data
                if (!ctx.session.appointmentData) {
                    ctx.session.appointmentData = {};
                }
                
                // Save reason for visit
                ctx.session.appointmentData.reasonForVisit = ctx.message.text.trim();
                ctx.session.step = 'appointment_confirm';

                const { doctorName, date, time, type } = ctx.session.appointmentData;

                // Validate required fields
                if (!doctorName || !date || !time || !type) {
                    await ctx.reply(
                        "❌ Missing appointment information. Please start the booking process again with /appointment."
                    );
                    ctx.session.step = 'idle';
                    ctx.session.appointmentData = {};
                    return;
                }

                await ctx.reply(
                    "📋 Please confirm your appointment details:\n\n" +
                    `Doctor: ${doctorName}\n` +
                    `Date: ${date}\n` +
                    `Time: ${time}\n` +
                    `Type: ${type}\n` +
                    `Reason: ${ctx.session.appointmentData.reasonForVisit}\n\n` +
                    "Is this correct? (Yes/No)"
                );
            } else if (ctx.session.step === 'appointment_confirm') {
                const answer = ctx.message.text.trim().toLowerCase();

                if (answer === 'yes' || answer === 'y') {
                    try {
                        // Validate session data
                        if (!ctx.session.appointmentData || !ctx.session.userData) {
                            throw new Error('Missing appointment or user data');
                        }
                        
                        const { doctorId, dateTime, type, reasonForVisit } = ctx.session.appointmentData;
                        
                        // Validate required fields
                        if (!doctorId || !dateTime || !type || !reasonForVisit) {
                            throw new Error('Missing required appointment fields');
                        }
                        
                        // Validate token
                        if (!ctx.session.userData.token) {
                            throw new Error('Missing authentication token');
                        }

                        // Validate API_URL is set
                        if (!process.env.API_URL) {
                            throw new Error('API_URL environment variable is not set');
                        }

                        // Create appointment via API
                        const response = await axios.post(
                            `${process.env.API_URL}/appointments`,
                            {
                                doctorId,
                                dateTime,
                                type,
                                reasonForVisit
                            },
                            {
                                headers: {
                                    'Authorization': `Bearer ${ctx.session.userData.token}`
                                }
                            }
                        );

                        if (response.data.appointment) {
                            await ctx.reply(
                                "✅ Your appointment has been scheduled successfully!\n\n" +
                                "You'll receive reminders before your appointment time."
                            );
                        }
                    } catch (error) {
                        console.error('Error creating appointment:', error.response?.data || error.message);
                        
                        // More specific error messages
                        if (error.message.includes('Missing appointment or user data') || 
                            error.message.includes('Missing required appointment fields')) {
                            await ctx.reply(
                                "❌ Incomplete appointment information. Please start the booking process again with /appointment."
                            );
                        } else if (error.message.includes('Missing authentication token')) {
                            await ctx.reply(
                                "❌ You need to be logged in to book an appointment. Please use /link to connect your account first."
                            );
                        } else if (error.response?.status === 401) {
                            await ctx.reply(
                                "❌ Your session has expired. Please use /link to reconnect your account."
                            );
                        } else if (error.response?.status === 409) {
                            await ctx.reply(
                                "❌ This appointment time is no longer available. Please try another time."
                            );
                        } else {
                            await ctx.reply(
                                "❌ Failed to schedule appointment. Please try again later or book through the website."
                            );
                        }
                    }

                    ctx.session.step = 'idle';
                    ctx.session.appointmentData = {};
                } else if (answer === 'no' || answer === 'n') {
                    await ctx.reply(
                        "❌ Appointment booking canceled. You can start over with /appointment or visit our website."
                    );

                    ctx.session.step = 'idle';
                    ctx.session.appointmentData = {};
                } else {
                    await ctx.reply("Please answer with Yes or No.");
                }
            } else if (ctx.session.step === 'assistant_chat') {
                // Handle chat with AI assistant
                try {
                    const userMessage = ctx.message.text.trim();
                    
                    // Validate API_URL is set
                    if (!process.env.API_URL) {
                        throw new Error('API_URL environment variable is not set');
                    }

                    // Call to virtual assistant API
                    const response = await axios.post(
                        `${process.env.API_URL}/assistant/chat`,
                        {
                            message: userMessage,
                            userId: ctx.session.userData?.userId || `telegram_${ctx.chat.id}` // Fallback ID for non-linked users
                        }
                    );

                    if (response.data.reply) {
                        await ctx.reply(response.data.reply, { parse_mode: 'Markdown' });
                    } else {
                        throw new Error('Empty reply from assistant');
                    }
                } catch (error) {
                    console.error('Error with assistant:', error.response?.data || error.message);
                    
                    if (error.message.includes('API_URL environment variable')) {
                        console.error(error.message);
                        await ctx.reply("❌ System configuration error. Please try again later.");
                    } else if (error.message === 'Empty reply from assistant') {
                        await ctx.reply("I don't have an answer for that. Please try asking a different question.");
                    } else {
                        await ctx.reply(
                            "I'm having trouble processing your request. Please try again later."
                        );
                    }
                }
            } else {
                // Handle messages when not in a specific flow
                await ctx.reply(
                    "I'm not sure what you're trying to do. Please use one of the available commands.\n\n" +
                    "Type /help to see what I can do for you."
                );
            }
        } catch (error) {
            console.error("Error in message handler:", error);
            try {
                await ctx.reply("An error occurred. Please try again later.");
            } catch (replyError) {
                console.error("Could not send error message:", replyError);
            }
            
            // Reset session to avoid stuck states
            ctx.session.step = 'idle';
        }
    });

    // View appointments command with better error handling
    bot.command("appointments", async (ctx) => {
        try {
            // Safety check for session
            if (!ctx.session || !ctx.session.userData) {
                ctx.session = {
                    step: 'idle',
                    userData: {},
                    appointmentData: {}
                };
            }

            if (!ctx.session.userData.userId || !ctx.session.userData.token) {
                await ctx.reply(
                    "You need to link your E-polyclinic.uz account first. Use /link to get started."
                );
                return;
            }

            // Validate API_URL is set
            if (!process.env.API_URL) {
                throw new Error('API_URL environment variable is not set');
            }
            
            try {
                // Fetch appointments from API
                const response = await axios.get(
                    `${process.env.API_URL}/appointments/patient/${ctx.session.userData.userId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${ctx.session.userData.token}`
                        }
                    }
                );

                const appointments = response.data.appointments;

                if (!appointments || appointments.length === 0) {
                    await ctx.reply("You don't have any upcoming appointments.");
                    return;
                }

                let message = "📅 Your upcoming appointments:\n\n";

                appointments.forEach((appointment, index) => {
                    // Validate appointment data
                    if (!appointment.dateTime || !appointment.doctor) {
                        return; // Skip invalid appointments
                    }
                    
                    const date = new Date(appointment.dateTime).toLocaleDateString();
                    const time = new Date(appointment.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const doctorName = appointment.doctor.firstName && appointment.doctor.lastName ? 
                        `${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 
                        "Unknown doctor";

                    message += `${index + 1}. Doctor: ${doctorName}\n`;
                    message += `   Date: ${date} at ${time}\n`;
                    message += `   Type: ${appointment.type || 'N/A'}\n`;
                    message += `   Status: ${appointment.status || 'scheduled'}\n\n`;
                });

                await ctx.reply(message);
            } catch (error) {
                console.error('Error fetching appointments:', error.response?.data || error.message);
                
                if (error.response?.status === 401) {
                    await ctx.reply(
                        "Your session has expired. Please use /link to reconnect your account."
                    );
                    
                    // Clear invalid token
                    ctx.session.userData.token = null;
                } else {
                    await ctx.reply(
                        "Failed to retrieve your appointments. Please try again later."
                    );
                }
            }
        } catch (error) {
            console.error("Error in appointments command:", error);
            await ctx.reply("An error occurred. Please try again later.");
        }
    });

    // Profile command
    bot.command("profile", async (ctx) => {
        try {
            // Safety check for session
            if (!ctx.session || !ctx.session.userData) {
                ctx.session = {
                    step: 'idle',
                    userData: {},
                    appointmentData: {}
                };
            }

            if (!ctx.session.userData.userId || !ctx.session.userData.token) {
                await ctx.reply(
                    "You need to link your E-polyclinic.uz account first. Use /link to get started."
                );
                return;
            }

            // Validate API_URL is set
            if (!process.env.API_URL) {
                throw new Error('API_URL environment variable is not set');
            }

            try {
                // Fetch user profile from API
                const response = await axios.get(
                    `${process.env.API_URL}/users/me`,
                    {
                        headers: {
                            'Authorization': `Bearer ${ctx.session.userData.token}`
                        }
                    }
                );

                const user = response.data.user;

                // Validate user data
                if (!user) {
                    throw new Error('Invalid user data received');
                }

                let message = "👤 Your Profile\n\n";
                message += `Name: ${user.firstName || 'N/A'} ${user.lastName || ''}\n`;
                message += `Email: ${user.email || 'N/A'}\n`;
                message += `Phone: ${user.phone || 'N/A'}\n`;

                if (user.role === 'patient') {
                    message += `Role: Patient\n`;
                    message += `Gender: ${user.gender || 'Not specified'}\n`;
                    if (user.dateOfBirth) {
                        const dob = new Date(user.dateOfBirth).toLocaleDateString();
                        message += `Date of Birth: ${dob}\n`;
                    }
                } else if (user.role === 'doctor') {
                    message += `Role: Doctor\n`;
                    message += `Specialization: ${user.specializations || 'N/A'}\n`;
                    message += `Experience: ${user.experience || 0} years\n`;
                    
                    if (user.consultationFee) {
                        message += `Consultation Fee: ${user.consultationFee} 'UZS'\n`;
                    }
                }

                message += "\nTo update your profile, please visit our website.";

                await ctx.reply(message);
            } catch (error) {
                console.error('Error fetching profile:', error.response?.data || error.message);
                
                if (error.response?.status === 401) {
                    await ctx.reply(
                        "Your session has expired. Please use /link to reconnect your account."
                    );
                    
                    // Clear invalid token
                    ctx.session.userData.token = null;
                } else {
                    await ctx.reply(
                        "Failed to retrieve your profile. Please try again later."
                    );
                }
            }
        } catch (error) {
            console.error("Error in profile command:", error);
            await ctx.reply("An error occurred. Please try again later.");
        }
    });

    // Unlink account command
    bot.command("unlink", async (ctx) => {
        try {
            // Safety check for session
            if (!ctx.session) {
                ctx.session = {
                    step: 'idle',
                    userData: {},
                    appointmentData: {}
                };
            }

            // Check if user has a linked account
            const user = await findUserByTelegramId(ctx.chat.id);

            if (!user) {
                await ctx.reply(
                    "Your account is not linked. Use /link to connect your E-polyclinic.uz account."
                );
                return;
            }

            ctx.session.step = 'unlink_confirm';

            await ctx.reply(
                "⚠️ Are you sure you want to unlink your E-polyclinic.uz account? You will no longer receive notifications.\n\n" +
                "Please reply with 'Yes' to confirm or 'No' to cancel."
            );
        } catch (error) {
            console.error("Error in unlink command:", error);
            await ctx.reply("An error occurred. Please try again later.");
        }
    });

    // Helper function to find user by Telegram ID
    async function findUserByTelegramId(telegramId) {
        try {
            if (!process.env.API_URL) {
                throw new Error('API_URL environment variable is not set');
            }

            const User = require('../user/model');
            return await User.findOne({ telegramId: telegramId.toString() });
        } catch (error) {
            console.error("Error finding user by Telegram ID:", error);
            return null;
        }
    }

    // Assistant command
    bot.command("assistant", async (ctx) => {
        try {
            ctx.session.step = 'assistant_chat';

            await ctx.reply(
                "👨‍⚕️ I'm the E-polyclinic.uz virtual medical assistant. I can answer general medical questions and provide health information.\n\n" +
                "What would you like to know about? (Type /stop to end the chat)"
            );
        } catch (error) {
            console.error("Error in assistant command:", error);
            await ctx.reply("An error occurred. Please try again later.");
        }
    });

    // Stop assistant chat
    bot.command("stop", async (ctx) => {
        try {
            if (ctx.session && ctx.session.step === 'assistant_chat') {
                ctx.session.step = 'idle';
                await ctx.reply("Virtual assistant chat ended. How else can I help you? Use /help to see available commands.");
            } else {
                await ctx.reply("No active assistant chat to stop. Use /help to see available commands.");
            }
        } catch (error) {
            console.error("Error in stop command:", error);
            await ctx.reply("An error occurred. Please try again later.");
        }
    });

    // Book appointment command
    bot.command("appointment", async (ctx) => {
        try {
            // Safety check for session
            if (!ctx.session) {
                ctx.session = {
                    step: 'idle',
                    userData: {},
                    appointmentData: {}
                };
            }

            if (!ctx.session.userData || !ctx.session.userData.userId || !ctx.session.userData.token) {
                await ctx.reply(
                    "You need to link your E-polyclinic.uz account first. Use /link to get started."
                );
                return;
            }

            // Validate API_URL is set
            if (!process.env.API_URL) {
                throw new Error('API_URL environment variable is not set');
            }

            try {
                // Fetch available specializations
                const response = await axios.get(
                    `${process.env.API_URL}/doctors/specializations`
                );

                const specializations = response.data.specializations;
                
                if (!specializations || !Array.isArray(specializations) || specializations.length === 0) {
                    throw new Error('No specializations available');
                }

                ctx.session.step = 'appointment_specialization';
                ctx.session.appointmentData = {};

                let message = "Please select a medical specializations:\n\n";
                specializations.forEach((spec, index) => {
                    message += `${index + 1}. ${spec}\n`;
                });
                
                message += "\nReply with the number of your selection.";

                await ctx.reply(message);
            } catch (error) {
                console.error('Error fetching specializations:', error.response?.data || error.message);
                
                if (error.message === 'No specializations available') {
                    await ctx.reply(
                        "There are currently no available specializations. Please try again later or book through our website."
                    );
                } else if (error.response?.status === 401) {
                    await ctx.reply(
                        "Your session has expired. Please use /link to reconnect your account."
                    );
                    
                    // Clear invalid token
                    ctx.session.userData.token = null;
                } else {
                    await ctx.reply(
                        "Failed to retrieve specializations. Please try booking through our website."
                    );
                }
                
                ctx.session.step = 'idle';
            }
        } catch (error) {
            console.error("Error in appointment command:", error);
            await ctx.reply("An error occurred. Please try again later.");
            
            // Reset to safe state
            ctx.session.step = 'idle';
        }
    });

    // Additional message handler for specializations selection
    // This should be added inside the main message:text handler, right before the final else block
    /* 
    else if (ctx.session.step === 'appointment_specialization') {
        const selection = parseInt(ctx.message.text.trim());
        
        try {
            // Validate selection
            if (isNaN(selection) || selection < 1 || selection > ctx.session.specializations.length) {
                await ctx.reply("Invalid selection. Please select a valid number from the list.");
                return;
            }
            
            const selectedSpecialization = ctx.session.specializations[selection - 1];
            ctx.session.appointmentData.specializations = selectedSpecialization;
            
            // Fetch doctors with this specializations
            const response = await axios.get(
                `${process.env.API_URL}/doctors?specializations=${encodeURIComponent(selectedSpecialization)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${ctx.session.userData.token}`
                    }
                }
            );
            
            const doctors = response.data.doctors;
            
            if (!doctors || doctors.length === 0) {
                await ctx.reply(
                    `No doctors available for ${selectedSpecialization}. Please select another specializations or try again later.`
                );
                ctx.session.step = 'idle';
                return;
            }
            
            ctx.session.doctors = doctors;
            ctx.session.step = 'appointment_doctor';
            
            let message = `Please select a doctor for ${selectedSpecialization}:\n\n`;
            doctors.forEach((doctor, index) => {
                message += `${index + 1}. Dr. ${doctor.firstName} ${doctor.lastName}\n`;
                message += `   Experience: ${doctor.experience} years\n`;
                message += `   Fee: ${doctor.consultationFee} 'UZS'\n\n`;
            });
            
            message += "Reply with the number of your selection.";
            
            await ctx.reply(message);
        } catch (error) {
            console.error('Error processing specializations selection:', error.response?.data || error.message);
            await ctx.reply(
                "Failed to process your selection. Please try again later or book through our website."
            );
            ctx.session.step = 'idle';
        }
    }
    */

    // Handle unlink confirmation in the message handler
    // This should be added inside the main message:text handler
    /*
    else if (ctx.session.step === 'unlink_confirm') {
        const answer = ctx.message.text.trim().toLowerCase();

        if (answer === 'yes' || answer === 'y') {
            try {
                // Find user by Telegram ID
                const User = require('../user/model');
                const user = await User.findOne({ telegramId: ctx.chat.id.toString() });
                
                if (!user) {
                    await ctx.reply("Your account is not linked to E-polyclinic.uz.");
                    ctx.session.step = 'idle';
                    return;
                }
                
                // Remove Telegram ID from user
                user.telegramId = undefined;
                await user.save();
                
                await ctx.reply(
                    "✅ Your E-polyclinic.uz account has been unlinked successfully.\n\n" +
                    "You will no longer receive notifications through Telegram.\n\n" +
                    "You can link your account again at any time by using the /link command."
                );
            } catch (error) {
                console.error('Error unlinking account:', error);
                await ctx.reply(
                    "Failed to unlink your account. Please try again later or contact support."
                );
            }
        } else if (answer === 'no' || answer === 'n') {
            await ctx.reply("Account unlinking canceled. Your account remains linked to E-polyclinic.uz.");
        } else {
            await ctx.reply("Please answer with Yes or No.");
            return; // Keep in the same step
        }
        
        ctx.session.step = 'idle';
    }
    */

    // Start the bot with better error handling
    if (process.env.NODE_ENV === 'production') {
        try {
            // Validate webhook configuration
            if (!process.env.WEBHOOK_DOMAIN) {
                throw new Error('WEBHOOK_DOMAIN environment variable is not set for production mode');
            }
            
            if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
                throw new Error('TELEGRAM_WEBHOOK_SECRET environment variable is not set for production mode');
            }
            
            // Use webhook in production
            const webhookDomain = process.env.WEBHOOK_DOMAIN;
            const secretPath = `/api/telegram/webhook/${process.env.TELEGRAM_WEBHOOK_SECRET}`;

            bot.api.setWebhook(`${webhookDomain}${secretPath}`)
                .then(() => {
                    console.log(`✅ Telegram bot webhook set up at ${webhookDomain}${secretPath}`);
                })
                .catch(error => {
                    console.error('❌ Failed to set webhook:', error);
                    console.log('❌ Falling back to long polling');
                    bot.start();
                });
        } catch (error) {
            console.error('❌ Error configuring webhook:', error);
            console.log('❌ Falling back to long polling due to configuration error');
            bot.start();
        }
    } else {
        // Use long polling in development
        bot.start();
        console.log('✅ Telegram bot started with long polling');
    }
}

// Export bot instance with additional error checking
module.exports = {
    telegramBot: bot,
    handleUpdate: (req, res) => {
        if (!bot) {
            return res.status(500).json({ error: 'Telegram bot not initialized' });
        }

        try {
            // Process update from webhook
            bot.handleUpdate(req.body);
            res.status(200).json({ status: 'ok' });
        } catch (error) {
            console.error('Error handling Telegram update:', error);
            res.status(500).json({ error: 'Failed to process update' });
        }
    }
};
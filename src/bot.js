const TelegramBot = require('node-telegram-bot-api');
const subscription = require('./commands/subscription');
const sortTool = require('./commands/sortTool');
const account = require('./commands/account');
const support = require('./commands/support');

const admin = require('./commands/admin');

require('dotenv').config();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Bot command routing
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const first_name = msg.from.first_name;

  // Save user data to the database
  await account.saveUserData(msg.from);
  bot.sendMessage(chatId, `Welcome, ${first_name}! Please choose commands from the options given below.`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Subscription 💰', callback_data: 'subscription' }],
        [{ text: 'Debounce 📧', callback_data: 'sort_tool' }],
        [
          { text: 'Account 🧾', callback_data: 'account' },
          { text: 'Support 💁‍♂️', callback_data: 'support' },
        ],
      ],
    },
  });

  // Handle inline button clicks via callback query
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const command = query.data; // This is the callback_data from the button

    // Execute the corresponding function directly
    try {
      const msg = { chat: { id: chatId }, from: query.from }; // Create a msg object with the expected structure
      switch (command) {
        case 'subscription':
    bot.removeListener('message');
          await subscription.handleSubscription(bot, msg);
          break;
        case 'sort_tool':
    bot.removeListener('message');
          await sortTool.handleSortTool(bot, msg);
          break;
        case 'account':
    bot.removeListener('message');
          await account.handleAccount(bot, msg);
          break;
        case 'support':
          await support.handleSupport(bot, msg);
    bot.removeListener('message');
          break;
      }
    } catch (error) {
      bot.sendMessage(chatId, 'Something went wrong. Please try again.');
      console.error(error);
    }

    // Acknowledge the callback query to remove the loading state
    bot.answerCallbackQuery(query.id);
  });
});

bot.onText(/\/subscription/, (msg) => {
    // bot.removeListener('callback_query');
    bot.removeListener('message');
    subscription.handleSubscription(bot, msg);});
bot.onText(/\/debounce/, (msg) => {
    // bot.removeListener('callback_query');
    bot.removeListener('message');
    sortTool.handleSortTool(bot, msg);});
bot.onText(/\/account/, (msg) => {
    // bot.removeListener('callback_query');
    bot.removeListener('message');
    account.handleAccount(bot, msg);});
bot.onText(/\/support/, (msg) => {
    // bot.removeListener('callback_query');
    bot.removeListener('message');
    support.handleSupport(bot, msg);});

bot.onText(/\/setprice/, (msg) => {
    bot.removeListener('callback_query');
    bot.removeListener('message');
    admin.handleSetPrice(bot, msg);});
bot.onText(/\/setcrypto/, (msg) => {
    bot.removeListener('callback_query');
    bot.removeListener('message');
    admin.handleSetCrypto(bot, msg);});
bot.onText(/\/broadcast/, (msg) => {
    bot.removeListener('callback_query');
    bot.removeListener('message');
    admin.handleBroadcast(bot, msg);});
bot.onText(/\/setsupport/, (msg) => {
  bot.removeListener('callback_query');
  bot.removeListener('message');
  admin.handleSetSupport(bot, msg);});

console.log('Bot is running...');

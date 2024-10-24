const supabase = require('../utils/database');

const ADMIN_ID = 7084704800;

exports.handleBroadcast = (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, 'Only admins can access this function.');
  }

  bot.sendMessage(chatId, 'Please send the message you want to broadcast. It can be text, an image, or both. Please send the message exactly as you want it to be broadcast.');

  bot.once('message', async (msg) => {
    const messageType = msg.text ? 'text' : (msg.photo ? 'photo' : null);

    if (messageType === 'text' || messageType === 'photo') {
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('telegram_id');

        if (error) {
          return bot.sendMessage(chatId, 'Error fetching users from the database.');
        }

        if (users && users.length > 0) {
          const userIds = users.map(user => user.telegram_id);

          for (const userId of userIds) {
            if (messageType === 'text') {
              await bot.sendMessage(userId, msg.text, {
                parse_mode: 'Markdown',
              });
            } else if (messageType === 'photo') {
              const caption = msg.caption || '';
              await bot.sendPhoto(userId, msg.photo[msg.photo.length - 1].file_id, {
                caption: caption,
                parse_mode: 'Markdown',
              });
            }
          }

          bot.sendMessage(chatId, `Broadcast complete. Message sent to ${users.length} users.`);
        } else {
          bot.sendMessage(chatId, 'No users found to broadcast the message.');
        }
      } catch (err) {
        console.error('Error during broadcast:', err);
        bot.sendMessage(chatId, 'There was an error broadcasting the message.');
      }
    } else {
      bot.sendMessage(chatId, 'Invalid message type. Please send either text or an image.');
    }
  });
};

exports.handleSetPrice = (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, 'Only admins can access this function.');
  }

  bot.sendMessage(chatId, `Please choose the key price to edit from the given options:`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Subscription', callback_data: 'sub' },
          { text: 'Credit', callback_data: 'cred' },
        ],
      ],
    },
  });

  // Listen for the admin's product selection (callback query)
  bot.once('callback_query', async (query) => {
    const command = query.data;
    let selectedKey;

    switch (command) {
      case 'sub':
        selectedKey = 'sub';
        break;
      case 'cred':
        selectedKey = 'cred';
        break;
      default:
        return bot.sendMessage(chatId, 'Invalid selection.');
    }

    bot.sendMessage(chatId, `You selected ${command.toUpperCase()}. Please enter the new price:`);

    // Listen for the admin's response
    bot.once('message', async (priceMsg) => {
      const price = parseFloat(priceMsg.text);

      if (isNaN(price) || price <= 0) {
        return bot.sendMessage(chatId, 'Please enter a valid numeric value for the price.');
      }

      try {
        const { error } = await supabase
          .from('admin')
          .update({ [command]: price })
          .eq('id', 1);

        if (error) {
          bot.sendMessage(chatId, 'There was an error updating the price in the database.');
          console.error(error);
        } else {
          bot.sendMessage(chatId, `The price for ${command.toUpperCase()} has been updated to $${price}.`);
        }
      } catch (err) {
        console.error('Database error:', err);
        bot.sendMessage(chatId, 'An error occurred while updating the price.');
      }
    });

    // Acknowledge the callback query
    bot.answerCallbackQuery(query.id);
  });
};

exports.handleSetSupport = (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, 'Only admins can access this function.');
  }

  bot.sendMessage(chatId, `Please send the message you want to set as support message`);

  bot.once('message', async (supportMsg) => {
    const supportTxt = parseFloat(supportMsg.text);

    try {
      const { error } = await supabase
        .from('admin')
        .update({ 'support': supportTxt })
        .eq('id', 1);

      if (error) {
        bot.sendMessage(chatId, 'There was an error updating the support message in the database.');
        console.error(error);
      } else {
        bot.sendMessage(chatId, `The support message has been updated`);
      }
    } catch (err) {
      console.error('Database error:', err);
      bot.sendMessage(chatId, 'An error occurred while updating the support message.');
    }
  });
};

exports.handleSetCrypto = (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, 'Only admins can access this function.');
  }

  bot.sendMessage(chatId, `Please choose the crypto address you want to edit:`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'USDT', callback_data: 'usdt' },
          { text: 'BTC', callback_data: 'btc' },
        ],
      ],
    },
  });

  bot.once('callback_query', async (query) => {
    const command = query.data;
    let selectedKey;

    switch (command) {
      case 'btc':
        selectedKey = 'btc';
        break;
      case 'usdt':
        selectedKey = 'usdt';
        break;
      default:
        return bot.sendMessage(chatId, 'Invalid selection.');
    }

    bot.sendMessage(chatId, `You selected ${command.toUpperCase()}. Please enter the new address:`);

    // Listen for the admin's response
    bot.once('message', async (cryptoMsg) => {
      const crypto = cryptoMsg.text

      try {
        const { error } = await supabase
          .from('admin')
          .update({ [command]: crypto })
          .eq('id', 1);

        if (error) {
          bot.sendMessage(chatId, 'There was an error updating the address in the database.');
          console.error(error);
        } else {
          bot.sendMessage(chatId, `The address for ${command.toUpperCase()} has been updated to ${crypto}.`);
        }
      } catch (err) {
        console.error('Database error:', err);
        bot.sendMessage(chatId, 'An error occurred while updating the address.');
      }
    });

    // Acknowledge the callback query
    bot.answerCallbackQuery(query.id);
  });
};
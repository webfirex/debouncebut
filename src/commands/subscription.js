const supabase = require('../utils/database');
const axios = require('axios');

async function fetchSubscriptionPrice() {
  try {
    const { data, error } = await supabase
      .from('admin')
      .select('subscription')
      .eq('id', 1)
      .single();

    if (error) {
      throw new Error('Error fetching subscription price from the database');
    }

    return data.subscription;
  } catch (error) {
    console.error('Error fetching key prices:', error);
    return null;
  } 
}

async function fetchCreditPrice() {
  try {
    const { data, error } = await supabase
      .from('admin')
      .select('credit')
      .eq('id', 1)
      .single();

    if (error) {
      throw new Error('Error fetching subscription price from the database');
    }

    return data.credit;
  } catch (error) {
    console.error('Error fetching key prices:', error);
    return null;
  }
}

async function fetchBTC() {
  try {
    const { data, error } = await supabase
      .from('admin')
      .select('btc')
      .eq('id', 1)
      .single();

    if (error) {
      throw new Error('Error fetching BTC address from the database');
    }

    return data.btc;
  } catch (error) {
    console.error('Error fetching BTC address:', error);
    return null;
  }
}

async function fetchUSDT() {
  try {
    const { data, error } = await supabase
      .from('admin')
      .select('usdt')
      .eq('id', 1)
      .single();

    if (error) {
      throw new Error('Error fetching USDT address from the database');
    }

    return data.usdt;
  } catch (error) {
    console.error('Error fetching USDT address:', error);
    return null;
  }
}

async function fetchUserData(id) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('type, credits, subscription, status')
      .eq('user_id', id)
      .single();

    if (error) {
      throw new Error('Error fetching user data from the database');
    }

    return {
      type: data.type,
      credits: data.credits,
      subscription: data.subscription,
      status: data.status
    };
    } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
    }
}

exports.handleSubscription = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const creditPrice = await fetchCreditPrice();
  const subscriptionPrice = await fetchSubscriptionPrice();
  const USDT_ADDRESS = await fetchUSDT();
  const BTC_ADDRESS = await fetchBTC();
  const userData = await fetchUserData(userId);

  // Clear any previous data in bot memory for this user
  bot.session = bot.session || {};
  bot.session[userId] = {};

  // Remove old event listeners
  bot.removeListener('message');
  bot.removeListener('callback_query');

  let initialMessage;

  if (userData.type === 'sub') {
    const subscriptionEndDate = new Date(userData.subscription);
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);
    const initialMessageText = userData.subscription 
      ? `Your current subscription started on ${userData.subscription} and will end on ${new Date(new Date(userData.subscription).setDate(new Date(userData.subscription).getDate() + 30)).toISOString().split('T')[0]}. The subscription price is $${subscriptionPrice} / 30 days. Please select your payment method:`
      : `You haven't purchased any subscription yet. The subscription price is $${subscriptionPrice}. Please select your payment method:`;

    initialMessage = await bot.sendMessage(chatId, initialMessageText, {
      reply_markup: {
      inline_keyboard: [
        [{ text: 'USDT', callback_data: 'pay.usdt.sub' }],
        [{ text: 'BTC', callback_data: 'pay.btc.sub' }],
      ],
      },
    });
  } else if (userData.type === 'cred') {
    initialMessage = await bot.sendMessage(chatId, `You have ${userData.credits} credits left. The price for credits is $${creditPrice}. Please enter the number of credits you want to purchase (minimum 1000):`);
    
    const messageListener = async (msg) => {
      if (msg.from.id !== userId || !msg.text || isNaN(msg.text) || msg.text.startsWith('/')) return; // Ignore other users' messages or commands

      const creditsToBuy = parseInt(msg.text.trim());
      if (creditsToBuy < 1000) {
        bot.sendMessage(chatId, 'The minimum number of credits you can purchase is 1000. Please enter a valid number of credits:');
        return;
      }

      const amountToPay = creditPrice * creditsToBuy;
      bot.session[userId].creditsToBuy = creditsToBuy;
      bot.session[userId].amountToPay = amountToPay;
      bot.removeListener('message');

      await bot.sendMessage(chatId, `The price for ${creditsToBuy} credits is $${amountToPay}. Please select your payment method:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'USDT', callback_data: 'pay.usdt.cred' }],
            [{ text: 'BTC', callback_data: 'pay.btc.cred' }],
          ],
        },
      });
    };

    bot.on('message', messageListener);
    bot.session[userId].messageListener = messageListener;
  }

  const callbackListener = async (query) => {
    if (query.from.id !== userId) return; // Ignore other users' queries

    const data = query.data;
    const chatId = query.message.chat.id;

    if (data.startsWith('pay')) {
      const [_, currency, userType] = data.split('.');
      const price = userType === 'sub' ? subscriptionPrice : bot.session[userId].amountToPay;
      const address = currency === 'usdt' ? USDT_ADDRESS : BTC_ADDRESS;

      // Edit message to send payment address and price
      await bot.editMessageText(`You selected ${userType === 'sub' ? 'subscription' : 'credits'}. The price is $${price}. Please send the payment to this ${currency.toUpperCase()} address:\n${address}\n\nOnce you've completed the payment, reply with the transaction ID and click the button below to check the transaction.`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Check Transaction', callback_data: `check.${userType}.${currency}` }],
          ],
        },
      });

      // Wait for the transaction ID
      const messageListener = async (msg) => {
        if (msg.from.id !== userId || !msg.text || msg.text.startsWith('/')) return; // Ignore other users' messages or commands

        const transactionId = msg.text.trim(); // Assuming user sends the transaction ID directly

        // Store the transaction ID in the user's session or a temporary storage
        bot.session[userId].transactionId = transactionId;

        bot.sendMessage(chatId, 'Transaction ID received. Please click the "Check Transaction" button to verify.');
      };

      bot.on('message', messageListener);
      bot.session[userId].messageListener = messageListener;

      // Handle check transaction button clicks
      const checkTransactionListener = async (query) => {
        if (query.from.id !== userId) return; // Ignore other users' queries

        const data = query.data;

        if (data.startsWith('check')) {
          const [_, userType, currency] = data.split('.');
          const transactionId = bot.session[userId].transactionId;
          const address = currency === 'usdt' ? USDT_ADDRESS : BTC_ADDRESS;
          const verifyTransaction = currency === 'usdt' ? verifyTrc20Transaction : verifyBtcTransaction;
          const dateNow = new Date();

          if (transactionId) {
            const response = await verifyTransaction(transactionId, address, userType === 'sub' ? subscriptionPrice : bot.session[userId].amountToPay, dateNow);
            if (response) {
              await processSuccessfulTransaction(userId, price, userType, transactionId, chatId, bot);
            } else {
              await bot.editMessageText('Transaction ID is invalid, or the amount/address doesn’t match. Please recheck the status by clicking the button below.', {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Recheck Transaction', callback_data: `recheck.${transactionId}.${userType}.${currency}` }],
                  ],
                },
              });
            }
          } else {
            bot.sendMessage(chatId, 'No transaction ID found. Please send the transaction ID first.');
          }
        }
      };

      bot.on('callback_query', checkTransactionListener);
      bot.session[userId].callbackListener = checkTransactionListener;
    }

    // Handle recheck button clicks
    if (data.startsWith('recheck')) {
      const [_, transactionId, userType, currency] = data.split('.');
      const price = userType === 'sub' ? subscriptionPrice : bot.session[userId].amountToPay;
      const address = currency === 'usdt' ? USDT_ADDRESS : BTC_ADDRESS;
      const verifyTransaction = currency === 'usdt' ? verifyTrc20Transaction : verifyBtcTransaction;
      const dateNow = new Date();

      const response = await verifyTransaction(transactionId, address, price, dateNow);

      if (response) {
        await processSuccessfulTransaction(userId, price, userType, transactionId, chatId, bot);
      } else {
        bot.sendMessage(chatId, 'Transaction still not confirmed. Please try again later.');
      }
    }
  };

  bot.on('callback_query', callbackListener);
  bot.session[userId].callbackListener = callbackListener;
};

async function processSuccessfulTransaction(userId, price, userType, transactionId, chatId, bot) {

  try {
    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: Number(userId), 
        type: userType, 
        amount: price,
        transaction: transactionId
      }]);

    if (userType === 'cred') {
      const { error: updateError } = await supabase
      .from('users')
      .update({ credits: supabase.raw('credits + ?', [bot.session[userId].creditsToBuy]) })
      .eq('user_id', Number(userId));

      if (updateError) {
      throw new Error('Error updating user credits');
      }
    } else if (userType === 'sub') {
      const { error: updateError } = await supabase
      .from('users')
      .update({ subscription: new Date().toISOString().split('T')[0] }) // Update subscription to current date
      .eq('user_id', Number(userId));

      if (updateError) {
      throw new Error('Error updating user subscription');
      }
    }

    if (error) {
      bot.sendMessage(chatId, 'Error processing your purchase. Please try again.');
      console.error(error);
    } else {
      bot.sendMessage(chatId, `Transaction confirmed! Your account balance / status has been updates \n\n Contact support for any queries /support`, {
        parse_mode: 'Markdown',
      });
    }
  } catch (err) {
    bot.sendMessage(chatId, 'Error retrieving license key. Please try again later.');
    console.error('Error:', err);
  }
}

async function verifyTrc20Transaction(txId, expectedAddress, expectedAmount, dateNow) {
  try {
    const url = `https://api.tronscan.org/api/transaction-info?hash=${txId}`;
    const response = await axios.get(url);

    if (response.data && response.data.contractType === 31) {
      const contract = response.data.tokenTransferInfo;
      const transactionAmount = parseFloat(contract.amount_str) / 10 ** 6; // Convert from SUN to USDT
      const transactionDate = new Date(response.data.timestamp); // Convert timestamp to date
      const isValidAmount = transactionAmount === expectedAmount;
      const isValidDate = transactionDate.toDateString() === dateNow.toDateString();
      const isValidAddress = contract.to_address === expectedAddress;
      const isSuccess = response.data.contractRet === 'SUCCESS';

      return isValidAmount && isValidDate && isValidAddress && isSuccess;
    }
    return false; // Transaction not found or doesn't meet criteria
  } catch (error) {
    return false;
  }
}

async function verifyBtcTransaction(txId, expectedAddress, expectedAmount, dateNow) {
  try {
    const url = `https://api.blockcypher.com/v1/btc/main/txs/${txId}`;
    const response = await axios.get(url);

    if (response.data && response.data.confirmations > 0) {
      const transactionDate = new Date(response.data.received);
      const isValidDate = transactionDate.toDateString() === dateNow.toDateString();
      const output = response.data.outputs.find((output) =>
        output.addresses.includes(expectedAddress) &&
        output.value === expectedAmount * 10 ** 8 // Convert BTC to Satoshis
      );

      return output && isValidDate;
    }
    return false; // Transaction not found or doesn't meet criteria
  } catch (error) {
    return false;
  }
}

const supabase = require('../utils/database');

async function fetcSupport() {
  try {
    const { data, error } = await supabase
      .from('admin')
      .select('support')
      .eq('id', 1)
      .single();

    if (error) {
      throw new Error('Error fetching support message from the database');
    }

    return data.support;
  } catch (error) {
    console.error('Error fetching support message:', error);
    return null;
  }
}

exports.handleSupport = async (bot, msg) => {
    const chatId = msg.chat.id;
    const message = await fetcSupport()
  
    // Customize this message as per your support details
    bot.sendMessage(chatId, message);
};
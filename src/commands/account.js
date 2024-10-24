const supabase = require('../utils/database');

exports.saveUserData = async (user) => {
  const { id, username, first_name, last_name } = user;
  const fullName = `${first_name || ''} ${last_name || ''}`.trim()
  const { data: existingUser } = await supabase.from('users').select('user_id').eq('user_id', id).single();
            
  if (existingUser) {
    console.log('User already exists, skipping insert.');
    return;
  }

  const { error } = await supabase.from('users').upsert({
    user_id: id,
    username: username || null,
    fullname: fullName,
  });

  if (error) {
    console.error('Error saving user data:', error);
  }
};

exports.handleAccount = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.chat.id;

  const { data, error } = await supabase.from('users').select('*').eq('user_id', userId);

  if (error || !data.length) {
    bot.sendMessage(chatId, 'Unable to fetch account details.');
  } else {
    const user = data[0];
    bot.sendMessage(
      chatId,
      `Account Details:\nUsername: ${user.username}\nName: ${user.fullname}\n\nStart Date: ${user.created_at}\n\nPlan Type: ${user.type === 'sub' && user.status ? 'Recurring' : user.type === 'cred' ? 'Credits' : 'Not Subscribed yet' }`,
    );
  }
};
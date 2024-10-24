const supabase = require('../utils/database');
const { processEmails } = require('./safelink/tool');  // Import the processEmails function
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

exports.handleSortTool = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.chat.id;
  bot.removeListener('document');

  // Fetch user subscription status and default key from the 'users' table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('status, type, subscription, credits')
    .eq('user_id', userId)
    .single(); // Expecting one user record

  if (userError) {
    bot.sendMessage(chatId, 'Error retrieving your account details.');
    console.error(userError);
    return;
  }

  const { status, type, subscription, credits } = userData;

  if (!status) {
    bot.sendMessage(chatId, "You haven't subscribed to the bot yet.");
    bot.removeListener('document');
    return;
  }

  bot.sendMessage(chatId, "Please send a .txt file containing the list of emails.");

  // Remove any existing 'document' listeners before adding a new one
  bot.removeListener('document');

  // Handle the file upload (assuming .txt file is sent)
  bot.on('document', async (fileMsg) => {
    const fileId = fileMsg.document.file_id;

    if (userId != fileMsg.chat.id) {return}

    // Get file link
    const file = await bot.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    // Download the file
    const fileName = path.join(__dirname, `emails_${chatId}.txt`);
    const response = await fetch(fileLink);
    const fileStream = fs.createWriteStream(fileName);

    pipeline(response.body, fileStream, (err) => {
      if (err) {
        bot.sendMessage(chatId, 'Error downloading the file. Please try again.');
        bot.removeListener('document');
      }
    });

    fileStream.on('finish', async () => {
      try {
        // Step 2: Call the tools.js function to process the emails
        bot.sendMessage(chatId, 'Processing your emails...');
        await processEmails(chatId);

        // Step 3: Send the resulting .txt files back to the user
        const enabledFilePath = path.join(__dirname, `./safelink/Enabled_${chatId}.txt`);
        const notEnabledFilePath = path.join(__dirname, `./safelink/NotEnabled_${chatId}.txt`);

        // Check if the files exist
        if (fs.existsSync(enabledFilePath) && fs.existsSync(notEnabledFilePath)) {
          await bot.sendDocument(chatId, enabledFilePath);
          await bot.sendDocument(chatId, notEnabledFilePath);
          fs.unlinkSync(fileName);
          fs.unlinkSync(enabledFilePath);
          fs.unlinkSync(notEnabledFilePath);
          bot.removeListener('document');
        } else {
          bot.sendMessage(chatId, 'Processing failed. Please try again.');
          fs.unlinkSync(fileName);
          fs.unlinkSync(enabledFilePath);
          fs.unlinkSync(notEnabledFilePath);
          bot.removeListener('document');
        }

      } catch (err) {
        bot.sendMessage(chatId, 'Error processing your file. Please try again.');
        bot.removeListener('document');
        console.error(err);
      }
    });
  });
};

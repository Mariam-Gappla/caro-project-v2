// utils/sms.js
const axios = require("axios");

const sendSms = async ({ phone, message }) => {
  return axios.post(
    "https://api.taqnyat.sa/v1/messages",
    {
      recipients: [phone],
      body: message,
      sender: process.env.SMS_SENDER
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.SMS_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
};

module.exports = sendSms;

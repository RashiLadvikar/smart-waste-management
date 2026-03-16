// twilioService.js
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID ;
const authToken = process.env.TWILIO_AUTH_TOKEN ;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
const client = new twilio(accountSid, authToken);

/**
 * Send SMS notification to worker about assigned task
 * @param {string} phoneNumber - Worker's phone number
 * @param {Object} task - Task details
 * @param {Object} worker - Worker details
 * @returns {Promise} - Promise resolving to message details
 */
async function sendTaskSMS(phoneNumber, task, worker) {
  try {
    // Format the message with task details
    const messageBody = `Hello ${worker.firstName}, this message is from smartwaste. You are assigned with a task of ${task.department} (${task.severity} priority) at ${task.location || 'designated area'}.\nThank you!!`;
    
    // Send the SMS
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: phoneNumber
    });
    
    console.log(`📱 SMS sent to ${worker.firstName} at ${phoneNumber} with SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error(`❌ Error sending SMS to ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Make an automated call to worker with task notification
 * @param {string} phoneNumber - Worker's phone number
 * @param {Object} task - Task details
 * @param {Object} worker - Worker details
 * @returns {Promise} - Promise resolving to call details
 */
async function notifyWorkerViaCall(phoneNumber, task, worker) {
  try {
    // Create TwiML for the voice call
    const twiml = new twilio.twiml.VoiceResponse();
    
    twiml.say(
      { voice: 'aditi' },
      `Hello ${worker.firstName}, this message is from smart waste. You are assigned with a task of ${task.department} at ${task.location || 'the designated area'}. The task has ${task.severity} priority. Thank you!`
    );
    
    // Add a pause and repeat
    twiml.pause({ length: 1 });
    twiml.say(
      { voice: 'aditi' },
      `I repeat, you have been assigned a new ${task.department} task. Thank you!`
    );
    
    // Make the call
    const call = await client.calls.create({
      twiml: twiml.toString(),
      to: phoneNumber,
      from: fromNumber
    });
    
    console.log(`📞 Call initiated to ${worker.firstName} at ${phoneNumber} with SID: ${call.sid}`);
    return call;
  } catch (error) {
    console.error(`❌ Error making call to ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Send both SMS and call notifications to worker
 * @param {string} phoneNumber - Worker's phone number
 * @param {Object} task - Task details
 * @param {Object} worker - Worker details
 * @returns {Promise} - Promise resolving to an array of notification results
 */
async function notifyWorkerBoth(phoneNumber, task, worker) {
  // Ensure phone number is in international format
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  
  // Array to hold results and errors
  const results = {
    call: null,
    sms: null,
    errors: []
  };
  
  // Send SMS first
  try {
    results.sms = await sendTaskSMS(formattedPhone, task, worker);
  } catch (error) {
    console.error(`❌ SMS notification failed for ${worker.firstName}:`, error);
    results.errors.push({ type: 'sms', error });
  }
  
  // Then make a call
  try {
    results.call = await notifyWorkerViaCall(formattedPhone, task, worker);
  } catch (error) {
    console.error(`❌ Call notification failed for ${worker.firstName}:`, error);
    results.errors.push({ type: 'call', error });
  }
  
  return results;
}

export { notifyWorkerBoth, sendTaskSMS, notifyWorkerViaCall };
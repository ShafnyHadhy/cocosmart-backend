import Product from '../models/product.js';
import { isAdmin } from './userController.js';
import User from '../models/user.js';
import Finance from '../models/finance.js';
import Driver from '../models/driver.js';
import Plot from '../models/plantation.js';
import Vehicle from '../models/vehicle.js';
import Delivery from '../models/delivery.js';
import Feedback from '../models/feedback.js';
// --- Conversational Templates ---
// By using arrays of responses, the bot can pick one randomly.
const GREETINGS = [
  "Hello! How can I help you with our coconut products today?",
  "Hi there! What can I get for you?",
  "Welcome to CocoSmart! Feel free to ask me anything about our products and services."
];

const FALLBACKS = [
  "I'm sorry, I couldn't find information about that. You can ask me about our products, prices, or descriptions.",
  "I'm not sure I understand. Could you try asking about a specific product?",
  "My apologies, I don't have the answer to that. I can help with questions about our product list and prices."
];

// Words to ignore when searching for products
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'what', 'when', 'where', 'why', 'how',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'in', 'on', 'at', 'for', 'to', 'of', 'with', 'by', 'about', 'tell', 'me', 'show', 'total',
  'price', 'cost', 'much', 'do', 'does', 'products', 'sell', 'your', 'our'
]);

// Helper function to find a product based on keywords in the user's message
const findProductByKeywords = async (messageWords) => {
  const searchWords = messageWords.filter(word => !STOP_WORDS.has(word));
  if (searchWords.length === 0) return null;

  // Create a regex that requires all keywords to be present
  // e.g., for "coconut milk", it looks for "coconut" AND "milk"
  const allWordsRegex = new RegExp(searchWords.map(word => `(?=.*${word})`).join(''), 'i');

  // Search in name, altNames, and description for a match
  return await Product.findOne({ $or: [{ name: allWordsRegex }, { altNames: { $in: searchWords } }, { description: allWordsRegex }] });
};

// A helper function to pick a random item from an array
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const handleChat = async (req, res) => {
  try {
    const { history } = req.body;
    if (!history || history.length === 0) {
      return res.status(400).json({ error: 'Chat history is required.' });
    }

    const userMessage = history[history.length - 1].text.toLowerCase();
    const messageWords = userMessage.split(/\s+/);

    let botResponse;

    // 1. Handle specific questions about price
    if (userMessage.includes('price') || userMessage.includes('cost') || userMessage.includes('how much')) {
      const product = await findProductByKeywords(messageWords);
      if (product) {
        botResponse = `The price of ${product.name} is LKR ${product.price}. Is there anything else I can help with?`;
      } else {
        botResponse = "I can tell you the price, but which product are you asking about?";
      }
    } 
    // 2. Handle questions about users/customers
    else if (userMessage.includes('user') || userMessage.includes('customer')) {
      if (userMessage.includes('how many') || userMessage.includes('count') || userMessage.includes('total')) {
        const userCount = await User.countDocuments({});
        botResponse = `We currently have ${userCount} registered users on our platform!`;
      } else {
        botResponse = "For privacy reasons, I can't share specific details about our users. I can tell you that we have a wonderful and growing community!";
      }
    }
    // 3. Handle questions about finance
    else if (userMessage.includes('finance') || userMessage.includes('income') || userMessage.includes('expense') || userMessage.includes('profit') || userMessage.includes('revenue')) {
      const calculateTotal = async (type) => {
        const result = await Finance.aggregate([
          { $match: { type: type } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        return result[0]?.total || 0;
      };

      const totalIncome = await calculateTotal('income');
      const totalExpense = await calculateTotal('expense');

      if (userMessage.includes('income') || userMessage.includes('revenue')) {
        botResponse = `The total income recorded so far is LKR ${totalIncome.toFixed(2)}.`;
      } else if (userMessage.includes('expense')) {
        botResponse = `The total expenses recorded so far are LKR ${totalExpense.toFixed(2)}.`;
      } else if (userMessage.includes('profit')) {
        const profit = totalIncome - totalExpense;
        botResponse = `The overall profit, calculated from total income minus total expenses, is LKR ${profit.toFixed(2)}.`;
      } else {
        botResponse = "I can provide details on total income, expenses, and profit. What specific financial information are you interested in?";
      }
    }
    // 4. Handle questions about drivers
    else if (userMessage.includes('driver')) {
      if (userMessage.includes('how many') || userMessage.includes('count') || userMessage.includes('total')) {
        const driverCount = await Driver.countDocuments({});
        botResponse = `We have a team of ${driverCount} dedicated drivers.`;
      } else if (userMessage.includes('list') || userMessage.includes('all')) {
        const drivers = await Driver.find({}, 'name status'); // Fetch only name and status for privacy
        if (drivers.length > 0) {
          const driverInfo = drivers.map(d => `${d.name} (status: ${d.status})`).join('; ');
          botResponse = `Our drivers and their current statuses are: ${driverInfo}.`;
        } else {
          botResponse = "We currently don't have any drivers listed in the system.";
        }
      } else {
        botResponse = "I can tell you the number of drivers or list them for you. What would you like to know?";
      }
    }
    // 5. Handle questions about plantations/plots
    else if (userMessage.includes('plantation') || userMessage.includes('plot')) {
      if (userMessage.includes('how many') || userMessage.includes('count') || userMessage.includes('total')) {
        const plotCount = await Plot.countDocuments({});
        botResponse = `We currently manage ${plotCount} plantation plots.`;
      } else if (userMessage.includes('list') || userMessage.includes('all')) {
        const plots = await Plot.find({}, 'name location noOfTrees'); // Fetch only name, location, and tree count
        if (plots.length > 0) {
          const plotInfo = plots.map(p => `${p.name} in ${p.location} (${p.noOfTrees} trees)`).join('; ');
          botResponse = `Here are our plantation plots: ${plotInfo}.`;
        } else {
          botResponse = "We currently don't have any plantation plots listed in the system.";
        }
      } else {
        botResponse = "I can provide information about our plantation plots. You can ask me to count or list them.";
      }
    }
   
    // 6. Handle questions about deliveries
    else if (userMessage.includes('delivery') || userMessage.includes('deliveries')) {
      if (userMessage.includes('how many') || userMessage.includes('count') || userMessage.includes('total')) {
        const deliveryCount = await Delivery.countDocuments({});
        botResponse = `There have been a total of ${deliveryCount} deliveries scheduled.`;
      } else if (userMessage.includes('list') || userMessage.includes('all')) {
        const deliveries = await Delivery.find({}).populate('order', 'orderID');
        if (deliveries.length > 0) {
          const deliveryInfo = deliveries.map(d => `Order ${d.order.orderID} (status: ${d.deliveryStatus})`).join('; ');
          botResponse = `Here are the recent deliveries: ${deliveryInfo}.`;
        } else {
          botResponse = "There are no delivery records in the system.";
        }
      } else {
        botResponse = "I can tell you about our deliveries. You can ask me to count or list them.";
      }
    }
    // 7. Handle questions about vehicles
    else if (userMessage.includes('vehicle')) {
      if (userMessage.includes('how many') || userMessage.includes('count') || userMessage.includes('total')) {
        const vehicleCount = await Vehicle.countDocuments({});
        botResponse = `There are ${vehicleCount} vehicles in the fleet.`;
      } else if (userMessage.includes('list') || userMessage.includes('all')) {
        const vehicles = await Vehicle.find({}, 'vehicleId type status'); // Fetch only non-sensitive data
        if (vehicles.length > 0) {
          const vehicleInfo = vehicles.map(v => `${v.vehicleId} (${v.type}, status: ${v.status})`).join('; ');
          botResponse = `Here are the vehicles in the fleet: ${vehicleInfo}.`;
        } else {
          botResponse = "There are currently no vehicles listed in the system.";
        }
      } else {
        botResponse = "I can provide information about our vehicles. You can ask me to count or list them.";
      }
    }
    // 8. Handle questions about feedback
    else if (userMessage.includes('feedback')) {
      const feedbackCount = await Feedback.countDocuments({});
      const averageRating = await Feedback.aggregate([{ $group: { _id: null, avgRating: { $avg: '$rating' } } }]);
      botResponse = `We have received ${feedbackCount} pieces of feedback with an average rating of ${averageRating[0]?.avgRating.toFixed(1) || 'N/A'} out of 5.`;
    }
    // 9. Check if the user is asking for a list of all products
    else if (userMessage.includes('products') || userMessage.includes('what do you sell')) {
      const allProducts = await Product.find({});
      if (allProducts.length > 0) {
        const productNames = allProducts.map(p => p.name).join(', ');
        botResponse = `We have the following products: ${productNames}. Which one would you like to know more about?`;
      } else {
        botResponse = "It looks like we don't have any products available at the moment. Please check back later!";
      }
    }
    // 10. Check for greetings (exact match)
    else if (userMessage === 'hello' || userMessage === 'hi') {
      botResponse = pickRandom(GREETINGS);
    }
    // NEW: Handle "thank you" and "goodbye"
    else if (userMessage.includes('thank you') || userMessage.includes('thanks')) {
      botResponse = "You're welcome! Is there anything else I can help you with?";
    }
    else if (userMessage.includes('bye') || userMessage.includes('goodbye')) {
      botResponse = "Goodbye! Have a great day.";
    }
    // 11. Handle general questions about a specific product (fallback)
    else {
      const product = await findProductByKeywords(messageWords);

      if (product) {
        botResponse = `Ah, ${product.name}! Here's what I know: ${product.description} It costs LKR ${product.price}.`;
      } else {
        botResponse = pickRandom(FALLBACKS);
      }
    }

    res.json({ response: botResponse });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Failed to process chat message.' });
  }
};

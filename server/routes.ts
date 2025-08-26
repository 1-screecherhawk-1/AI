
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, insertUserSchema, loginUserSchema } from "@shared/schema";
import { generateToken, requireAuth } from "./auth";

// Free Hugging Face API for AI responses
const HF_API_URL = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium";
const HF_TOKEN = process.env.HUGGING_FACE_TOKEN || null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      const token = generateToken(user.id);
      
      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginUserSchema.parse(req.body);
      const user = await storage.authenticateUser(credentials);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      const token = generateToken(user.id);
      
      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // With JWT, logout is handled client-side by removing the token
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all conversations for the authenticated user
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.userId!);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const data = insertConversationSchema.parse(req.body);
      const conversationData = {
        ...data,
        userId: req.userId!,
      };
      const conversation = await storage.createConversation(conversationData);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ message: "Invalid conversation data" });
    }
  });

  // Get conversation by ID
  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      // Check if conversation belongs to the current user
      if (conversation.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      // Check if conversation belongs to the current user
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteConversation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      // Check if conversation belongs to the current user
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send message and get AI response
  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      const conversationId = req.params.id;
      
      // Verify conversation exists and belongs to user
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Create user message
      const userMessage = await storage.createMessage({
        conversationId,
        content,
        role: "user"
      });

      // Get conversation history for context
      const messages = await storage.getMessages(conversationId);
      
      // Prepare messages for OpenAI API (exclude the current message as it's already included)
      const conversationHistory = messages.slice(0, -1).map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      try {
        // Enhanced response generation with better logic
        let aiResponse;
        
        const lowerContent = content.toLowerCase();
        
        // Math calculations
        if (lowerContent.includes('x') || lowerContent.includes('*') || lowerContent.includes('+') || lowerContent.includes('-') || lowerContent.includes('/')) {
          try {
            // Extract and evaluate simple math expressions
            const mathMatch = content.match(/(\d+(?:\.\d+)?)\s*[x*]\s*(\d+(?:\.\d+)?)/i);
            if (mathMatch) {
              const num1 = parseFloat(mathMatch[1]);
              const num2 = parseFloat(mathMatch[2]);
              const result = num1 * num2;
              aiResponse = `The answer is: **${result.toLocaleString()}**\n\nCalculation: ${num1.toLocaleString()} × ${num2.toLocaleString()} = ${result.toLocaleString()}`;
            } else {
              // Try to evaluate other basic math
              const cleanMath = content.replace(/[^0-9+\-*/().]/g, '');
              if (cleanMath && /^[0-9+\-*/().]+$/.test(cleanMath)) {
                const result = eval(cleanMath);
                aiResponse = `The answer is: **${result.toLocaleString()}**`;
              }
            }
          } catch (e) {
            aiResponse = "I can help with basic math calculations. Could you rephrase your question with a clearer mathematical expression?";
          }
        }
        // Greeting responses
        else if (lowerContent.includes('hello') || lowerContent.includes('hi')) {
          aiResponse = "Hello! I'm your AI assistant. How can I help you today?";
        }
        // Status responses
        else if (lowerContent.includes('how are you')) {
          aiResponse = "I'm doing well, thank you for asking! I'm here to help you with any questions or tasks you have.";
        }
        // Capability responses
        else if (lowerContent.includes('what can you do')) {
          aiResponse = "I can help you with various tasks like:\n\n- **Math calculations** (try asking me to multiply large numbers!)\n- **Answering questions**\n- **Providing explanations**\n- **Writing assistance**\n- **Problem solving**\n- **General conversation**\n\nWhat would you like help with?";
        }
        // Gratitude responses
        else if (lowerContent.includes('thank')) {
          aiResponse = "You're welcome! Is there anything else I can help you with?";
        }
        // Time/date questions
        else if (lowerContent.includes('time') || lowerContent.includes('date')) {
          const now = new Date();
          aiResponse = `The current time is: **${now.toLocaleTimeString()}**\nThe current date is: **${now.toLocaleDateString()}**`;
        }
        // Default helpful response
        else {
          aiResponse = `I understand you're asking about "${content}". I'm a demo AI assistant that can help with basic questions, math calculations, and general conversation.

**Try asking me:**
- Math problems (like "what is 123 x 456?")
- "What can you do?"
- "What time is it?"
- General questions

For advanced AI capabilities with real knowledge, you would need to connect to OpenAI or another AI service. This interface demonstrates all the ChatGPT-style features without requiring payment!`;
        }

        // Create AI message
        const aiMessage = await storage.createMessage({
          conversationId,
          content: aiResponse,
          role: "assistant"
        });

        // Update conversation title if this is the first message
        if (messages.length === 1) {
          const title = content.length > 50 ? content.substring(0, 50) + "..." : content;
          await storage.updateConversation(conversationId, { title });
        }

        // Update conversation updatedAt
        await storage.updateConversation(conversationId, { updatedAt: new Date() });

        res.json({
          userMessage,
          aiMessage
        });

      } catch (error: any) {
        console.error("Response generation error:", error);
        
        // Create error message for user
        const errorMessage = await storage.createMessage({
          conversationId,
          content: "I'm sorry, I'm having trouble generating a response right now. Please try again in a moment.",
          role: "assistant"
        });

        res.status(500).json({
          userMessage,
          aiMessage: errorMessage,
          error: "Response generation temporarily unavailable"
        });
      }

    } catch (error) {
      console.error("Message creation error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

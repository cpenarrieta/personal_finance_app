import { ChatPageClient } from "@/components/chat/ChatPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Chat - Transaction Insights",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * AI Chat page for asking questions about transactions
 * Uses AI SDK with custom tools to query transaction data
 */
export default function ChatPage() {
  return <ChatPageClient />;
}

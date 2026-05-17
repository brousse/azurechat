"use server";

import {
  RevalidateCache,
} from "@/features/common/navigation-helpers";
import { ServerActionResponse } from "@/features/common/server-action-response";
import { redirect } from "next/navigation";
import {
  FindAllChatThreadForCurrentUser,
  SoftDeleteChatThreadForCurrentUser,
  UpsertChatThread,
} from "../chat-services/chat-thread-service";
import { ChatThreadModel } from "../chat-services/models";

export const DeleteChatThreadByID = async (chatThreadID: string) => {
  await SoftDeleteChatThreadForCurrentUser(chatThreadID);
  // The (chat) layout fetches the thread list — invalidate it so the deleted
  // row disappears immediately. Without this, the RSC redirect lands on /chat
  // but the parent layout's cached payload still includes the deleted thread
  // until a hard reload.
  RevalidateCache({
    page: "chat",
    type: "layout",
  });
  redirect("/chat");
};

export const DeleteAllChatThreads = async (): Promise<
  ServerActionResponse<boolean>
> => {
  const chatThreadResponse = await FindAllChatThreadForCurrentUser();

  if (chatThreadResponse.status === "OK") {
    const chatThreads = chatThreadResponse.response;
    const promise = chatThreads.map(async (chatThread) => {
      return SoftDeleteChatThreadForCurrentUser(chatThread.id);
    });

    await Promise.all(promise);
    RevalidateCache({
      page: "chat",
      type: "layout",
    });
    return {
      status: "OK",
      response: true,
    };
  }

  return chatThreadResponse;
};

export const UpdateChatThreadTitle = async (props: {
  chatThread: ChatThreadModel;
  name: string;
}) => {
  await UpsertChatThread({
    ...props.chatThread,
    name: props.name,
  });

  RevalidateCache({
    page: "chat",
    type: "layout",
  });
};

export const BookmarkChatThread = async (props: {
  chatThread: ChatThreadModel;
}) => {
  await UpsertChatThread({
    ...props.chatThread,
    bookmarked: !props.chatThread.bookmarked,
  });

  RevalidateCache({
    page: "chat",
    type: "layout",
  });
};

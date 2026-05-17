import { FC } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { AddExtension } from "./add-extension/add-new-extension";
import { ExtensionCard } from "./extension-card/extension-card";
import { ExtensionHero } from "./extension-hero/extension-hero";
import { ExtensionModel } from "./extension-services/models";
import { userHashedId } from "../auth-page/helpers";

interface Props {
  extensions: ExtensionModel[];
}

export const ExtensionPage = async (props: Props) => {
  const hashedId = await userHashedId();
  return (
    <ScrollArea className="flex-1">
      <main className="flex flex-1 flex-col">
        <ExtensionHero />
        <div className="container max-w-4xl py-8 px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {props.extensions.map((extension) => (
              <ExtensionCard
                extension={extension}
                key={extension.id}
                showActionMenu={extension.userId === hashedId}
              />
            ))}
          </div>
        </div>
        <AddExtension />
      </main>
    </ScrollArea>
  );
};

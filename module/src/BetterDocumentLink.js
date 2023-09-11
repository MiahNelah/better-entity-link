export class BetterDocumentLink {
    static get id() {
        return "better-entity-link"
    }

    static _contextMenuName() {
        return "BetterDocumentLink"
    }

    static instance() {
        return game.modules.get(BetterDocumentLink.id)?._instance
    }

    static registerAction(documentType, options) {
        const instance = BetterDocumentLink.instance();
        if (instance === undefined) {
            BetterDocumentLink.initialize()
            return BetterDocumentLink.registerAction(documentType, options);
        }
        return instance.registerAction(documentType, options)
    }

    static enhanceDocumentLinks(app, html, data) {
        return BetterDocumentLink.instance().enhanceDocumentLinks(app, html, data)
    }

    static registerActorAction(options) {
        return BetterDocumentLink.registerAction("Actor", options);
    }

    static registerItemAction(options) {
        return BetterDocumentLink.registerAction("Item", options);
    }

    static registerSceneAction(options) {
        return BetterDocumentLink.registerAction("Scene", options);
    }

    static registerJournalEntryAction(options) {
        return BetterDocumentLink.registerAction("JournalEntry", options);
    }

    static registerJournalEntryPageAction(options) {
        return BetterDocumentLink.registerAction("JournalEntryPage", options);
    }

    static registerMacroAction(options) {
        return BetterDocumentLink.registerAction("Macro", options);
    }

    static registerRolltableAction(options) {
        return BetterDocumentLink.registerAction("RollTable", options);
    }

    static registerCardStacksAction(options) {
        return BetterDocumentLink.registerAction("Cards", options);
    }

    static registerPlaylistAction(options) {
        return BetterDocumentLink.registerAction("Playlist", options);
    }

    static registerPlaylistSoundAction(options) {
        return BetterDocumentLink.registerAction("PlaylistSound", options);
    }

    static _defaultContextMenu() {
        return {
            "Actor": [],
            "Item": [],
            "Scene": [],
            "JournalEntry": [],
            "JournalEntryPage": [],
            "Macro": [],
            "RollTable": [],
            "Cards": [],
            "Playlist": [],
            "PlaylistSound": []
        };
    }

    static initialize() {
        if (BetterDocumentLink.instance() !== undefined) return;

        const module = game.modules.get(BetterDocumentLink.id);
        const instance = new BetterDocumentLink(module);
        module.registerAction =  instance.registerAction;
        module.enhanceDocumentLink = instance.enhanceDocumentLink;
        module.enhanceDocumentLinks = instance.enhanceDocumentLinks;

        module.registerActorAction = BetterDocumentLink.registerActorAction;
        module.registerItemAction = BetterDocumentLink.registerItemAction;
        module.registerSceneAction = BetterDocumentLink.registerSceneAction;
        module.registerJournalEntryAction = BetterDocumentLink.registerJournalEntryAction;
        module.registerJournalEntryPageAction = BetterDocumentLink.registerJournalEntryPageAction;
        module.registerMacroAction = BetterDocumentLink.registerMacroAction;
        module.registerRolltableAction = BetterDocumentLink.registerRolltableAction;
        module.registerCardStacksAction = BetterDocumentLink.registerCardStacksAction;
        module.registerPlaylistAction = BetterDocumentLink.registerPlaylistAction;
        module.registerPlaylistSoundAction = BetterDocumentLink.registerPlaylistSoundAction;
    }

    constructor(module) {
        this.contextMenus = duplicate(BetterDocumentLink._defaultContextMenu());
        module._instance = this;
    }

    registerAction(documentType, options) {
        const actionMenu = {
            name: options.name,
            icon: `<i class="fas ${options.icon}"></i>`,
            condition: li => {
                const documentUuid = li.data("uuid");                
                const document = fromUuidSync(documentUuid);                
                return options.condition instanceof Function && options.condition(documentUuid, document);
            },
            callback: async li => {
                const documentUuid = li.data("uuid");                
                const document = await fromUuid(documentUuid);
                return await options.callback(document);
            }
        }
        this.contextMenus[documentType].push(actionMenu);
    }

    enhanceDocumentLink(app, link) {
        const documentType = this._resolveDocumentType($(link));
        const contextOptions = this.contextMenus[documentType];
        if (!contextOptions?.length) return undefined;
        ContextMenu.create(app, $(link), "a.content-link", contextOptions, BetterDocumentLink._contextMenuName);
    }

    enhanceDocumentLinks(app, html) {
        if (!html === null || !html) return undefined;

        const links = html.find("a.content-link:not([data-contextmenu])");
        if (links === null || links === undefined || (Array.isArray(links) && !links.length)) return undefined;

        setTimeout(() => {
            for (let link of links) {
                this.enhanceDocumentLink(app, $(link));
            }
        }, 100);
    }

    _resolveDocumentType(documentLink) {
        if (documentLink[0].hasAttribute("data-type")) return documentLink.data("type");
        if (documentLink[0].hasAttribute("data-pack")) {
            const packId = documentLink.data("pack");
            return game.packs.get(packId).documentName;
        }
        // TODO: add resolving from <i> font-awesome icon class ?
        return undefined;
    }
}

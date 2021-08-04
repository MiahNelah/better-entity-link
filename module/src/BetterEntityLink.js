export class BetterEntityLink {
    static get id() {
        return "better-entity-link"
    }

    static _contextMenuName() {
        return "BetterEntityLink"
    }

    static instance() {
        return game.modules.get(BetterEntityLink.id)?._instance
    }

    static registerAction(entityType, options) {
        const instance = BetterEntityLink.instance();
        if (instance === undefined) {
            BetterEntityLink.initialize()
            return BetterEntityLink.registerAction(entityType, options);
        }
        return instance.registerAction(entityType, options)
    }

    static enhanceEntityLinks(app, html, data) {
        return BetterEntityLink.instance().enhanceEntityLinks(app, html, data)
    }

    static registerActorAction(options) {
        return BetterEntityLink.registerAction("Actor", options);
    }

    static registerItemAction(options) {
        return BetterEntityLink.registerAction("Item", options);
    }

    static registerSceneAction(options) {
        return BetterEntityLink.registerAction("Scene", options);
    }

    static registerJournalEntryAction(options) {
        return BetterEntityLink.registerAction("JournalEntry", options);
    }

    static registerMacroAction(options) {
        return BetterEntityLink.registerAction("Macro", options);
    }

    static registerRolltableAction(options) {
        return BetterEntityLink.registerAction("RollTable", options);
    }

    static _defaultContextMenu() {
        return {
            "Actor": [],
            "Item": [],
            "Scene": [],
            "JournalEntry": [],
            "Macro": [],
            "RollTable": []
        };
    }

    static initialize() {
        if (BetterEntityLink.instance() !== undefined) return;

        const module = game.modules.get(BetterEntityLink.id);
        const instance = new BetterEntityLink();
        module._instance = instance;
        module.registerAction =  instance.registerAction;
        module.enhanceEntityLink = instance.registerAction;
        module.enhanceEntityLinks = instance.enhanceEntityLinks;
    }

    constructor() {
        this.contextMenus = duplicate(BetterEntityLink._defaultContextMenu());
    }

    registerAction(entityType, options) {
        const actionMenu = {
            name: options.name,
            icon: `<i class="fas ${options.icon}"></i>`,
            condition: async li => this._isValidEntityType(li, entityType) && (options.condition(li) || true),
            callback: async li => {
                const entity = await this._resolveEntity(entityType, li.data("id"), li.data("pack"));
                return await options.callback(entity);
            }
        }
        this.contextMenus[entityType].push(actionMenu);
    }

    enhanceEntityLink(link) {
        const entityType = this._resolveEntityType($(link));
        const contextOptions = this.contextMenus[entityType];
        if (!contextOptions.length) return undefined;
        new ContextMenu($(link), undefined, contextOptions, BetterEntityLink._contextMenuName);
    }

    enhanceEntityLinks(app, html, data) {
        if (html === null || html === undefined) return undefined;

        const links = html.find("a.entity-link:not([data-contextmenu])");
        if (links === null || links === undefined || (Array.isArray(links) && !links.length)) return undefined;

        setTimeout(() => {
            for (let link of links) {
                this.enhanceEntityLink($(link));
            }
        }, 100);
    }

    _isValidEntityType(entityLink, type) {
        return type.localeCompare(this._resolveEntityType(entityLink), undefined, {sensitivity: "base"});
    }

    async _resolveEntity(type, id, packId) {
        return packId ? await game.packs.get(packId)?.getDocument(id) : game.collections.get(type)?.get(id);
    }

    _resolveEntityType(entityLink) {
        if (entityLink.data("entity")) return entityLink.data("entity");
        if (entityLink.data("pack")) {
            const packId = entityLink.data("pack");
            return game.packs.get(packId).documentName;
        }
        // TODO: add resolving from <i> font-awesome icon class
        return undefined;
    }
}
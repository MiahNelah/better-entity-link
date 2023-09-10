import { BetterEntityLink } from "./BetterEntityLink.js";

function renderImagePopup(image, title, uuid, shareable) {
    const imagePoput = new ImagePopout(image, {
        title: title,
        shareable: shareable,
        uuid: uuid
    });
    imagePoput.render(true);
}

async function showImage(uuid, title, type) {
    await game.socket.emit("showEntry", uuid, type, true, entry => {
        Journal._showEntry(uuid, type, true);
        ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
            mode: type,
            title: title,
            which: "all"
        }));
    });
}

function permissionHelper(obj, permissions) {
    // empty or invalid obj must NOT block condition
    if (!obj || !obj.permission) return true;
    if (!permissions || !(permissions instanceof Array) || permissions.length == 0) return true;
    return permissions.includes(obj.permission);
}

function safeSetInterval(condition, callback, delay, timeout) {
    let tracker = 0;
    const intervalId = setInterval(() => {
        if (condition()) {
            clearInterval(intervalId);
            return callback();
        }

        tracker += delay;
        if (tracker >= timeout)
            clearInterval(intervalId);
    }, delay);
}

Hooks.on('ready', () => {

    // Scene - "View" button
    BetterEntityLink.registerSceneAction({
        name: "SCENES.View",
        icon: "fa-eye",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted) && !data.isView,
        callback: async entity => await entity.view()
    });

    // Scene - "Activate" button
    BetterEntityLink.registerSceneAction({
        name: "SCENES.Activate",
        icon: "fa-bullseye",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted) && !data.active,
        callback: async entity => await entity.activate()
    });

    // RollTable - "Roll" button
    BetterEntityLink.registerRolltableAction({
        name: "TABLE.Roll",
        icon: "fa-dice-d20",
        condition: (uuid, data) => (game.user.isGM || game.user.isTrusted) || permissionHelper(data, [CONST.ENTITY_PERMISSIONS.OBSERVER, CONST.ENTITY_PERMISSIONS.OWNER]),
        callback: async entity => await entity.draw()
    });

    // RollTable - "Configure Ownership" button
    BetterEntityLink.registerRolltableAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: (uuid, data) => game.user.isGM || game.user.isTrusted,
        callback: async entity => new DocumentOwnershipConfig(entity).render(true)
    });

    // Macro - "Edit Macro" button
    BetterEntityLink.registerMacroAction({
        name: "MACRO.Edit",
        icon: "fa-edit",
        condition: (uuid, data) => game.user.isGM || game.user.isTrusted || permissionHelper(data, [CONST.ENTITY_PERMISSIONS.OBSERVER, CONST.ENTITY_PERMISSIONS.OWNER]),
        callback: async entity => entity.sheet.render(true)
    });

    // Actor - "Select" button
    BetterEntityLink.registerActorAction({
        name: "CONTROLS.CanvasSelect",
        icon: "fa-hand-pointer",
        condition: (uuid, data) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),
        callback: async entity => {
            if (!canvas.tokens.active) canvas.tokens.activate();
            canvas.tokens.releaseAll();
            entity.getActiveTokens().forEach(x => x.control({releaseOthers: false}));
        }
    });

    // Actor - "Target" button
    BetterEntityLink.registerActorAction({
        name: "CONTROLS.TargetSelect",
        icon: "fa-bullseye",
        condition: (uuid, data) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),
        callback: async entity => {
            if (!canvas.tokens.active) canvas.tokens.activate();
            entity.getActiveTokens()
                .filter(token => !token.isTargeted)
                .forEach(token => token.setTarget(true, {releaseOthers: false}));
        }
    });

    // Actor - "Ping" button
    BetterEntityLink.registerActorAction({
        name: "CONTROLS.CanvasPing",
        icon: "fa-map-pin",
        condition: (uuid, data) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),        
        callback: async entity => Promise.all(entity.getActiveTokens().map(async x => canvas.ping(x.center)))
    });

    // Actor - "Ping Alert" button
    BetterEntityLink.registerActorAction({
        name: "CONTROLS.CanvasPingAlert",
        icon: "fa-map-pin",
        condition: (uuid, data) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),
        callback: async entity => Promise.all(entity.getActiveTokens().map(async x => canvas.ping(x.center, {style:CONFIG.Canvas.pings.types.ALERT})))
    });

    // Actor - "Pull to Ping" button
    BetterEntityLink.registerActorAction({
        name: "CONTROLS.CanvasPingPull",
        icon: "fa-map-pin",
        condition: (uuid, data) => canvas.ready && canvas.tokens.placeables.some(x => x.actor.uuid.endsWith(uuid)),
        callback: async entity => Promise.all(entity.getActiveTokens().map(async x => canvas.ping(x.center, {style:CONFIG.Canvas.pings.types.PULL, pull:true})))
    });

    // Actor - "Token Configuration" button
    BetterEntityLink.registerActorAction({
        name: "TOKEN.Title",
        icon: "fa-user-circle",
        condition: (uuid, data) => data?.prototypeToken && (game.user.isGM || game.user.isTrusted || permissionHelper(data, [CONST.ENTITY_PERMISSIONS.OBSERVER, CONST.ENTITY_PERMISSIONS.OWNER])),
        callback: async entity => new CONFIG.Token.prototypeSheetClass(entity.prototypeToken).render(true)
    });

    // Actor - "View Character Artwork" button
    BetterEntityLink.registerActorAction({
        name: "SIDEBAR.CharArt",
        icon: "fa-image",
        condition: (uuid, data) => data?.img && ![undefined, null, CONST.DEFAULT_TOKEN].includes(data?.img),
        callback: async entity => renderImagePopup(entity.img, entity.name, entity.uuid, true)
    });

    // Actor - "View Token Artwork" button
    BetterEntityLink.registerActorAction({
        name: "SIDEBAR.TokenArt",
        icon: "fa-image",
        condition: (uuid, data) => data?.prototypeToken?.texture?.src && ![undefined, null, CONST.DEFAULT_TOKEN].includes(data?.prototypeToken.texture.src),
        callback: async entity => renderImagePopup(entity.prototypeToken.texture.src, entity.name, entity.uuid, true)
    });

    // Actor - "Configure Ownership" button
    BetterEntityLink.registerActorAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: (uuid, data) => game.user.isGM || game.user.isTrusted,
        callback: async entity => new DocumentOwnershipConfig(entity).render(true)
    });

    // Item - "View Item Artwork" button
    BetterEntityLink.registerItemAction({
        name: "ITEM.ViewArt",
        icon: "fa-image",
        condition: (uuid, data) => ![undefined, null, CONST.DEFAULT_TOKEN].includes(data?.img),
        callback: async entity => renderImagePopup(entity.img, entity.name, entity.uuid, true)
    });

    // Item - "View Item Artwork" button
    BetterEntityLink.registerItemAction({
        name: "OWNERSHIP.OWNER",
        icon: "fa-crown",
        condition: (uuid, data) => data && data.isEmbedded && data.parent,
        callback: async entity => entity.parent.sheet.render(true)
    });

    // Item - "Configure Ownership" button
    BetterEntityLink.registerItemAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: (uuid, data) => game.user.isGM || game.user.isTrusted,
        callback: async entity => new DocumentOwnershipConfig(entity).render(true)
    });

    // JournalEntry - "Show players (Text)" button
    BetterEntityLink.registerJournalEntryAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeText")})`,
        icon: "fa-eye",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async entity => await showImage(entity.uuid, entity.name, "text")
    });

    // JournalEntry - "Show players (Image)" button
    BetterEntityLink.registerJournalEntryAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeImage")})`,
        icon: "fa-eye",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async entity => await showImage(entity.uuid, entity.name, "image")
    });

    // JournalEntry - "Jump to Pin" button
    // If no pin is found in current scene, look up for pins in others scenes
    BetterEntityLink.registerJournalEntryAction({
        name: "SIDEBAR.JumpPin",
        icon: "fa-crosshairs",
        condition: (uuid, data) => data.sceneNote ? true
            : game.scenes.filter(s => s.notes.filter(x => x.entryId === data.id).length > 0).length > 0,
        callback: async entity => {
            if (entity.scenenote)
                return entity.panToNote();

            // Note is not in current scene, we look in all scenes and take first match
            const scene = game.scenes.filter(s => s.notes.filter(x => x.entryId === entity.id).length > 0)[0];
            await scene.view();

            // Wait 30s maximum for canvas to be ready before panning to note. Check is done every 0.5 second.
            safeSetInterval(() => canvas.ready, () => entity.panToNote(), 500, 30000);
        }
    });

    // JournalEntry - "Configure Ownership" button
    BetterEntityLink.registerJournalEntryAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: (uuid, data) => game.user.isGM || game.user.isTrusted,
        callback: async entity => new DocumentOwnershipConfig(entity).render(true)
    });

    // Cardstacks - "Shuffle" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Shuffle",
        icon: "fa-random",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("hand", undefined, { sensitivity: "base" }) !== 0,
        callback: async entity => await entity.shuffle()
    });

    // Cardstacks - "Draw" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Draw",
        icon: "fa-edit",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("hand", undefined, { sensitivity: "base" }) === 0,
        callback: async entity => await entity.drawDialog()
    });

    // Cardstacks - "Deal" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Deal",
        icon: "fa-share-square",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("deck", undefined, { sensitivity: "base" }) === 0,
        callback: async entity => await entity.dealDialog()
    });

    // Cardstacks - "Pass" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Pass",
        icon: "fa-share-square",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("deck", undefined, { sensitivity: "base" }) !== 0,
        callback: async entity => await entity.passDialog()
    });

    // Cardstacks - "Reset" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Reset",
        icon: "fa-undo",
        condition: (uuid, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async entity => await entity.resetDialog()
    });

    // Cardstacks - "Configure Ownership" button
    BetterEntityLink.registerCardStacksAction({
        name: "OWNERSHIP.Configure",
        icon: "fa-lock fa-fw",
        condition: (uuid, data) => game.user.isGM || game.user.isTrusted,
        callback: async entity => new DocumentOwnershipConfig(entity).render(true)
    });

    Hooks.on('renderJournalSheet', BetterEntityLink.enhanceEntityLinks);
    Hooks.on('renderActorSheet', BetterEntityLink.enhanceEntityLinks);
    Hooks.on('renderJournalPageSheet', BetterEntityLink.enhanceEntityLinks);
    Hooks.on('renderItemSheet', BetterEntityLink.enhanceEntityLinks);
    //Hooks.on('renderChatMessage', BetterEntityLink.enhanceEntityLinks);
})

/*
Hooks.on('renderApplication', enhanceEntityLink);
Hooks.on('renderDocumentSheet', enhanceEntityLink);
Hooks.on('renderRollTableConfig', enhanceEntityLink);
Hooks.on('renderSidebarTab', enhanceEntityLink);
Hooks.on('renderFormApplication', enhanceEntityLink);
*/

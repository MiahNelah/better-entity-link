import { BetterEntityLink } from "./BetterEntityLink.js";

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
        condition: (id, pack, data) => (game.user.isGM || game.user.isTrusted) && !data.isView,
        callback: async entity => await entity.view()
    });

    // Scene - "Activate" button
    BetterEntityLink.registerSceneAction({
        name: "SCENES.Activate",
        icon: "fa-bullseye",
        condition: (id, pack, data) => (game.user.isGM || game.user.isTrusted) && !data.active,
        callback: async entity => await entity.activate()
    });

    // RollTable - "Roll" button
    BetterEntityLink.registerRolltableAction({
        name: "TABLE.Roll",
        icon: "fa-dice-d20",
        condition: (id, pack, data) => (game.user.isGM || game.user.isTrusted) || permissionHelper(data, [CONST.ENTITY_PERMISSIONS.OBSERVER, CONST.ENTITY_PERMISSIONS.OWNER]),
        callback: async entity => await entity.draw()
    });

    // Macro - "Edit Macro" button
    BetterEntityLink.registerMacroAction({
        name: "MACRO.Edit",
        icon: "fa-edit",
        condition: (id, pack, data) => game.user.isGM || game.user.isTrusted || permissionHelper(data, [CONST.ENTITY_PERMISSIONS.OBSERVER, CONST.ENTITY_PERMISSIONS.OWNER]),
        callback: async entity => entity.sheet.render(true)
    });

    // Actor - "View Character Artwork" button
    BetterEntityLink.registerActorAction({
        name: "SIDEBAR.CharArt",
        icon: "fa-image",
        condition: (id, pack, data) => data?.img !== CONST.DEFAULT_TOKEN
            && (game.user.isGM
                || game.user.isTrusted
                || permissionHelper(data, [CONST.ENTITY_PERMISSIONS.OBSERVER, CONST.ENTITY_PERMISSIONS.OWNER])),
        callback: async entity => {
            const imagePoput = new ImagePopout(entity?.img, {
                title: entity.name,
                shareable: true,
                uuid: entity.uuid
            });
            imagePoput.render(true);
        }
    });

    // Actor - "View Token Artwork" button
    BetterEntityLink.registerActorAction({
        name: "SIDEBAR.TokenArt",
        icon: "fa-image",
        condition: (id, pack, data) => {
            if (data?.prototypeToken?.texture?.src) return false;
            return ![undefined, null, CONST.DEFAULT_TOKEN].includes(data?.prototypeToken.texture.src)
                && (game.user.isGM
                    || game.user.isTrusted
                    || permissionHelper(data, [CONST.ENTITY_PERMISSIONS.OBSERVER, CONST.ENTITY_PERMISSIONS.OWNER]))
        },
        callback: async entity => {
            const imagePoput = new ImagePopout(entity?.prototypeToken.texture.src, {
                title: entity.name,
                shareable: true,
                uuid: entity.uuid
            });
            imagePoput.render(true);
        }
    });

    // Item - "View Item Artwork" button
    BetterEntityLink.registerItemAction({
        name: "ITEM.ViewArt",
        icon: "fa-image",
        condition: (id, pack, data) => data?.img !== CONST.DEFAULT_TOKEN
            && (game.user.isGM
                || game.user.isTrusted
                || permissionHelper(data, [CONST.ENTITY_PERMISSIONS.OBSERVER, CONST.ENTITY_PERMISSIONS.OWNER])),
        callback: async entity => {
            const imagePoput = new ImagePopout(entity?.img, {
                title: entity.name,
                shareable: true,
                uuid: entity.uuid
            });
            imagePoput.render(true);
        }
    });

    // JournalEntry - "Show players (Text)" button
    BetterEntityLink.registerJournalEntryAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeText")})`,
        icon: "fa-eye",
        condition: (id, pack, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async entity => {
            await game.socket.emit("showEntry", entity.uuid, "text", true, entry => {
                Journal._showEntry(entity.uuid, "text", true);
                ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
                    mode: "text",
                    title: entity.name,
                    which: "all"
                }));
            });
        }
    });

    // JournalEntry - "Show players (Image)" button
    BetterEntityLink.registerJournalEntryAction({
        name: `${game.i18n.localize("JOURNAL.ActionShow")} (${game.i18n.localize("JOURNAL.ModeImage")})`,
        icon: "fa-eye",
        condition: (id, pack, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async entity => {
            await game.socket.emit("showEntry", entity.uuid, "image", true, entry => {
                Journal._showEntry(entity.uuid, "image", true);
                ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
                    mode: "image",
                    title: entity.name,
                    which: "all"
                }));
            });
        }
    });

    // JournalEntry - "Jump to Pin" button
    // If no pin is found in current scene, look up for pins in others scenes
    BetterEntityLink.registerJournalEntryAction({
        name: "SIDEBAR.JumpPin",
        icon: "fa-crosshairs",
        condition: (id, pack, data) => data.sceneNote ? true
            : game.scenes.filter(s => s.notes.filter(x => x.entryId === data.id).length > 0).length > 0,
        callback: async entity => {
            if (entity.scenenote)
                return entity.panToNote();

            // Note is not in current scene, we look in all scenes and take first match
            const scene = game.scenes.filter(s => s.notes.filter(x => x.entryId === entity.id).length > 0)[0];
            await scene.view();

            // Wait 30s maximum for canvas to be ready before panning to note. Check is done every 0.5 second.
            safeSetInterval(() => canvas.ready, () => entity.panToNote(), 500, 30000);

            // We wait for canvas being ready, then pan to note
            /*
            const intervalId = setInterval(() => {
                if (canvas.ready) {
                    clearInterval(intervalId);
                    return entity.panToNote();
                }
            }, 250);
            */
        }
    });

    // Cardstacks - "Shuffle" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Shuffle",
        icon: "fa-random",
        condition: (id, pack, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("hand", undefined, { sensitivity: "base" }) !== 0,
        callback: async entity => await entity.shuffle()
    });

    // Cardstacks - "Draw" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Draw",
        icon: "fa-edit",
        condition: (id, pack, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("hand", undefined, { sensitivity: "base" }) === 0,
        callback: async entity => await entity.drawDialog()
    });

    // Cardstacks - "Deal" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Deal",
        icon: "fa-share-square",
        condition: (id, pack, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("deck", undefined, { sensitivity: "base" }) === 0,
        callback: async entity => await entity.dealDialog()
    });

    // Cardstacks - "Pass" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Pass",
        icon: "fa-share-square",
        condition: (id, pack, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted) && data.type.localeCompare("deck", undefined, { sensitivity: "base" }) !== 0,
        callback: async entity => await entity.passDialog()
    });

    // Cardstacks - "Reset" button
    BetterEntityLink.registerCardStacksAction({
        name: "CARDS.Reset",
        icon: "fa-undo",
        condition: (id, pack, data) => data?.img !== CONST.DEFAULT_TOKEN && (game.user.isGM || game.user.isTrusted),
        callback: async entity => await entity.resetDialog()
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

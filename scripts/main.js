// Inizializzazione delle impostazioni
Hooks.once("init", () => {
  // Registra l'impostazione principale per Major Wound
  game.settings.register("coc7_memorable_major_wound", "enabled", {
    name: "Enable Major Wound Rules",
    hint: "Check to enable Major Wound rules.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => updateDependentSettingsUI(value) // Funzione per aggiornare la UI dinamicamente
  });

  // Registra le impostazioni dipendenti
  registerDependentSetting("impairedEnabled", "Enable Impaired Rule", "Check to enable Impaired rule when suffering a Major Wound.");
  registerDependentSetting("scarsEnabled", "Enable Scars Rule", "Check to enable Scars rule when suffering a Major Wound.");
  registerDependentSetting("traumaticEnabled", "Enable Traumatic Wounds Rule", "Check to enable Traumatic Wounds rule when suffering a Major Wound.");

  // Aggiorna la UI delle impostazioni dipendenti all'avvio
  updateDependentSettingsUI(game.settings.get("coc7_memorable_major_wound", "enabled"));
});

// Funzione per registrare le impostazioni dipendenti
function registerDependentSetting(key, name, hint) {
  game.settings.register("coc7_memorable_major_wound", key, {
    name: name,
    hint: hint,
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    restricted: true // Rende le impostazioni modificabili solo dai GM
  });
}

// Funzione per aggiornare la UI delle impostazioni dipendenti
function updateDependentSettingsUI(isEnabled) {
  const dependentSettings = ["impairedEnabled", "scarsEnabled", "traumaticEnabled"];

  dependentSettings.forEach(setting => {
    // Recupera la voce di impostazione
    const element = document.querySelector(`[name="coc7_memorable_major_wound.${setting}"]`);
    if (element) {
      // Disabilita/abilita l'impostazione nella UI in base al valore di "enabled"
      element.disabled = !isEnabled;
    }
  });
}

// Riaggiorna la UI ogni volta che il menu delle impostazioni è aperto
Hooks.on("renderSettingsConfig", (app, html, data) => {
  const isEnabled = game.settings.get("coc7_memorable_major_wound", "enabled");
  updateDependentSettingsUI(isEnabled);

  // Aggiunge il listener diretto alla checkbox di "enabled"
  html.find(`[name="coc7_memorable_major_wound.enabled"]`).on("change", (event) => {
    updateDependentSettingsUI(event.target.checked);
  });
});


// Intercetta il danno per calcolare la Severity solo se il modulo è abilitato
Hooks.on("updateActor", async (actor, updateData) => {
  const isEnabled = game.settings.get("coc7_memorable_major_wound", "enabled");
  if (!isEnabled) return;

  if (!updateData.system?.attribs?.hp?.value) return;

  const currentHP = updateData.system.attribs.hp.value;
  const maxHP = actor.system.attribs.hp.max;
  const damage = maxHP - currentHP;
  const majorWoundThreshold = Math.floor(maxHP / 2);

  // Controlla se il danno causa un Major Wound
  if (damage >= majorWoundThreshold) {
    const severity = Math.floor(damage - majorWoundThreshold);
    actor.setFlag("coc7_memorable_major_wound", "severity", severity);
    let sanMessage = '';

    const traumaticEnabled = game.settings.get("coc7_memorable_major_wound", "traumaticEnabled");
    if (traumaticEnabled) {
      // Esegui il tiro di SAN
      const sanRoll = new Roll("1d100");
      await sanRoll.evaluate({ async: true });
      const sanSuccessThreshold = actor.system.attribs.san.value; // Soglia di successo SAN
      
      // Controlla se il tiro di SAN ha successo
      if (sanRoll.total <= sanSuccessThreshold) {
        sanMessage = `${actor.name} successfully passes their SAN roll and does not lose any SAN.`;
      } else {
        // Calcola la perdita di SAN
        let sanLoss = severity > 0 ? severity : 1; // Se severity è 0, puoi decidere di fare perdere 1 SAN
        await actor.update({ "system.attribs.san.value": Math.max(0, actor.system.attribs.san.value - sanLoss) });
        sanMessage = `${actor.name} fails their SAN roll and loses ${sanLoss} SAN!`;
      }
    }
    // Aggiorna lo stato dell'attore
    actor.update({
      "system.status.conditions.criticalWounds.value": damage > majorWoundThreshold + 10,
      "system.status.conditions.dying.value": damage >= maxHP,
    });

    // Solo se la regola "Impaired" non è attiva, tira sulla tabella
    const impairedEnabled = game.settings.get("coc7_memorable_major_wound", "impairedEnabled");

    // Tiro di 1d20 per determinare la locazione
    const locationRoll = new Roll("1d20");
    await locationRoll.evaluate({ async: true });
    const rollResult = locationRoll.total;
    let woundSide = '';

    // Determina la locazione della ferita
    if (rollResult >= 1 && rollResult <= 3) {
      woundSide = "Right Leg";
    } else if (rollResult >= 4 && rollResult <= 6) {
      woundSide = "Left Leg";
    } else if (rollResult >= 7 && rollResult <= 10) {
      woundSide = "Abdomen";
    } else if (rollResult >= 11 && rollResult <= 15) {
      woundSide = "Chest";
    } else if (rollResult >= 16 && rollResult <= 17) {
      woundSide = "Right Arm";
    } else if (rollResult >= 18 && rollResult <= 19) {
      woundSide = "Left Arm";
    } else if (rollResult === 20) {
      woundSide = "Head";
    }

    // Messaggio finale
    let severityMessage = severity > 0 ? `Severity: ${severity}.` : '';
    let msg = `${actor.name} suffers a Major Wound in the ${woundSide}! ${severityMessage} ${sanMessage}`;
    
    if (impairedEnabled) {
      msg += ` ${woundSide} is impaired until recovery!`;
      actor.setFlag("coc7_memorable_major_wound", "impaired", woundSide);
    }

    // Invia il messaggio in chat
    ChatMessage.create({
      speaker: { alias: actor.name },
      content: msg
    });

    // Se "Impaired" non è attivo, tira sulla tabella corrispondente
    if (!impairedEnabled) {
      const woundTable = game.tables.getName(`${woundSide} Wound Table`);
      if (woundTable) {
        const woundRollResult = await woundTable.roll();
        let description = '';
        const totalRoll = woundRollResult.roll._total;

        if (woundRollResult.results.length > 0) {
          const firstResult = woundRollResult.results[0];
          if (firstResult.type === CONST.TABLE_RESULT_TYPES.DOCUMENT) {
            const item = game.items.get(firstResult.documentId);
            if (item) {
              description = `${item.name}: ${await TextEditor.enrichHTML(item.system.description.value, { async: true })}`;
            } else {
              ui.notifications.error(game.i18n.localize("CoC7.MessageMajorWoundItemNotFound"));
            }
          } else if (firstResult.type === CONST.TABLE_RESULT_TYPES.TEXT) {
            description = await TextEditor.enrichHTML(firstResult.text, { async: true });
          }
        } else {
          ui.notifications.error(game.i18n.localize("CoC7.MessageMajorWoundTableNotFound"));
        }

        // Invia il messaggio con il risultato del tiro
        ChatMessage.create({
          speaker: { alias: actor.name },
          content: `Major Wound Roll Result: ${totalRoll} (${woundSide}) - ${description}`
        });
      }
    }
    
    // Gestione della regola SCARS
    const scarsEnabled = game.settings.get("coc7_memorable_major_wound", "scarsEnabled");
    if (scarsEnabled) {
      if (woundSide === "Head" || woundSide === "Face") {
        const scarRoll = new Roll("1d6");
        await scarRoll.evaluate({ async: true });
        const scarResult = scarRoll.total;
        let scarMessage = '';

        if (scarResult <= 2) {
          scarMessage = "The scar is attractive.";
          actor.update({ "system.characteristics.app.value": Math.max(0, actor.system.characteristics.app.value + severity) });
        } else if (scarResult <= 4) {
          scarMessage = "The scar is neutral.";
        } else {
          scarMessage = "The scar is unattractive.";
          actor.update({ "system.characteristics.app.value": Math.max(0, actor.system.characteristics.app.value - severity) });
        }
        console.log(scarMessage)
        // Invia il messaggio della cicatrice con dettagli sull'attrattiva
        ChatMessage.create({
          speaker: { alias: actor.name },
          content: `${actor.name} receives a scar on their ${woundSide}. ${scarMessage}`
        });
      } else {
        // Messaggio per cicatrici in altre parti del corpo
        ChatMessage.create({
          speaker: { alias: actor.name },
          content: `${actor.name} receives a scar on their ${woundSide}.`
        });
      }
    }
  } else {
    actor.setFlag("coc7_memorable_major_wound", "severity", 0);
  }
});

// Modifica il tiro sulla tabella delle ferite in base alla Severity
Hooks.on("preRollTable", (roll, table) => {
  if (table.name.includes("Wound Table")) {
    const actor = game.actors.get(roll.options.actorId);
    if (!actor) return;

    const severity = actor.getFlag("coc7_memorable_major_wound", "severity") || 0;
    const severityModifier = severity * 5;

    // Aggiunge il modificatore di Severity al tiro
    roll._total += severityModifier;
    ui.notifications.info(`Severity modifier applied: +${severityModifier}`);
  }
});

// Gestisce il penalità die quando il tiro coinvolge la parte del corpo colpita
Hooks.on("preRoll", (roll) => {
  const actorId = roll.options.actorId;
  const actor = game.actors.get(actorId);

  if (actor) {
    const impairedPart = actor.getFlag("coc7_memorable_major_wound", "impaired");
    if (impairedPart) {
      roll.advantage = false;  // Disabilita vantaggio
      roll.dice.push(new Die("d10", { "penalty": true }));  // Aggiungi il dado penalizzato
      ui.notifications.info(`Rolling with a penalty die due to impairment of the ${impairedPart}`);
    }
  }
});
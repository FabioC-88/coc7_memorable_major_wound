# CoC7 Memorable Major Wounds

This **Foundry VTT** module introduces and manages optional *Major Wound* rules for *Call of Cthulhu 7th Edition*. It provides a set of configuration options to make serious injuries more impactful and memorable in gameplay. 

## Features

1. **Major Wound Rules**: Calculates and applies the effects of severe injuries, managing damage based on thresholds related to a character’s max hit points.
2. **Impaired Rule**: Permanently impairs the affected body part until it’s fully healed.
3. **Scars Rule**: Adds scars based on injury severity, potentially affecting the character’s *Appearance* (APP) characteristic.
4. **Traumatic Wounds Rule**: Manages SAN rolls and consequences of serious failures, impacting the character’s mental state.

## Requirements

- **Foundry VTT** version **X.X.X** or higher
- **Call of Cthulhu 7th Edition System** version **X.X.X** or higher

## Installation

### Via Foundry VTT Module Manager

1. In Foundry VTT, open the **Add-on Module** tab.
2. Click **Install Module**.
3. Search for **CoC7 Memorable Major Wounds** in the list of available modules.
4. Click **Install** to add it to your game.
5. Once installed, go to your game world, open the **Manage Modules** tab, and enable **CoC7 Memorable Major Wounds**.

### Manual Installation

1. Download or clone this repository.
2. Copy the `coc7_memorable_major_wound` folder into Foundry VTT’s `modules` directory.
3. Start Foundry and enable the module from the game world settings.

## Configuration

In the game world settings menu, enable and customize the following options:

1. **Enable Major Wound Rules**: Activates the core *Major Wound* rules. If disabled, all other optional rules will also be unavailable.
2. **Enable Impaired Rule**: When enabled, adds a permanent penalty to the affected body part until it heals and disable the roll on the Major Wound Table.
3. **Enable Scars Rule**: Generates a scar each time a character sustains a head or face wound, with potential effects on the *Appearance* characteristic.
4. **Enable Traumatic Wounds Rule**: Applies SAN loss and psychological consequences if the injury is severe enough.

## Usage

### Core Hooks

- `updateActor`: Intercepts actor updates to check hit point values, activating *Major Wound* effects if needed.
- `preRollTable`: Modifies rolls on wound tables based on injury severity, adding a modifier that scales with the wound’s severity.

### Chat Messages

Injury outcomes and SAN roll results are communicated directly in chat, providing immediate feedback to players on the effects of injuries.

## Customization

To adjust optional rules to your needs, modify settings directly from Foundry. Any additional functionality or updates can be added in the `main.js` file.

## License

This module is open-source and available under the MIT license. You’re free to modify it, but please retain this license statement.

## Support

For bug reports or feature requests, please open an issue in this repository’s **Issues** section.


import { GEN2_CONTROLS } from "../gen2/index.js";

/**
 * APP - Gen-2 registration
 * =============================================================================
 * Defines the generic control library with the custom element registry.
 *
 * Registration is an application decision, not a library one: a document
 * chooses which tag names it wants to exist. Keeping the side effect here means
 * importing a control class never mutates the global registry, which is what
 * lets the tests construct controls in isolation and lets the control gallery
 * register Gen 2 without dragging in a single line of application code.
 *
 * Calling this more than once is safe.
 *
 * @returns {string[]} The tag names that are now defined.
 */
export function registerGen2Controls()
{
    const registered = [];

    for (let index = 0; index < GEN2_CONTROLS.length; index = index + 1)
    {
        const controlClass = GEN2_CONTROLS[index];
        controlClass.define();
        registered.push(controlClass.elementName);
    }

    return registered;
}

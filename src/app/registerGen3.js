import { GEN3_ELEMENTS } from "../gen3/index.js";

/**
 * APP - Gen-3 registration
 * =============================================================================
 * Defines the application's own elements with the custom element registry.
 *
 * The generic library registers separately, in registerGen2.js, and the control
 * gallery calls only that one. That separation is the load-bearing part of the
 * claim this repository makes: if the gallery had to register Gen 3 in order to
 * work, Gen 2 would not really be independent.
 *
 * Calling this more than once is safe.
 *
 * @returns {string[]} The tag names that are now defined.
 */
export function registerGen3Elements()
{
    const registered = [];

    for (let index = 0; index < GEN3_ELEMENTS.length; index = index + 1)
    {
        const elementClass = GEN3_ELEMENTS[index];
        elementClass.define();
        registered.push(elementClass.elementName);
    }

    return registered;
}

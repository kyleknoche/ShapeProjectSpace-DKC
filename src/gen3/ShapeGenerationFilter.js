import { RadioGroup } from "../gen2/RadioGroup.js";

/**
 * GEN 3 - ShapeGenerationFilter
 * =============================================================================
 * Lineage: HTMLElement -> AbstractElement -> RadioGroup -> ShapeGenerationFilter
 *
 * Narrows a view to one generation of the Three-Gen pattern.
 *
 * The control is a radio group and behaves exactly like one. What Gen 3 adds is
 * that the options are generations, that the empty value means everything, and
 * that the announcement is called shape-generation-filter so the page can route
 * it without inspecting values.
 *
 * Properties
 *   generation   {string} "" | "Gen 1" | "Gen 2" | "Gen 3"
 *
 * Events
 *   shape-generation-filter   detail { generation }
 *   plus every event RadioGroup emits.
 *
 * Abstract action
 *   Inherited as "select", extended with the project's announcement.
 */
export class ShapeGenerationFilter extends RadioGroup
{
    static elementName = "shape-generation-filter";

    buildElements()
    {
        super.buildElements();
        this.classList.add("shape-generation-filter");
    }

    onConnected()
    {
        super.onConnected();

        if (this.items.length === 0)
        {
            this.items = GENERATION_OPTIONS;
        }

        if (this.label === "")
        {
            this.label = "Show";
        }

        this.orientation = "horizontal";
    }

    /**
     * @returns {string}
     */
    get generation()
    {
        return this.value;
    }

    set generation(value)
    {
        this.selectValue(value);
    }

    abstractAction(payload)
    {
        const result = super.abstractAction(payload);

        if (result.handled === false)
        {
            return result;
        }

        this.emit("shape-generation-filter", { generation: result.detail.value });

        return {
            action: result.action,
            handled: true,
            detail: { generation: result.detail.value, previousGeneration: result.detail.previousValue }
        };
    }
}

/**
 * The generations a visitor can filter to. The empty value means everything.
 */
const GENERATION_OPTIONS =
[
    { value: "", label: "Everything" },
    { value: "Gen 1", label: "Gen 1" },
    { value: "Gen 2", label: "Gen 2" },
    { value: "Gen 3", label: "Gen 3" }
];

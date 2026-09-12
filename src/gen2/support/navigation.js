/**
 * GEN 2 SUPPORT - navigation
 * =============================================================================
 * Keyboard index arithmetic for the four controls that move a cursor through a
 * flat list of rows: ListBox, TreeView, TreeListView and DataGrid.
 *
 * Those four are siblings and cannot inherit from one another, so the logic they
 * genuinely share lives here rather than above one of them. This module is the
 * intended answer to that constraint, and the same answer as HierarchyModel:
 * when sibling controls need the same behaviour, extract a plain object or a
 * pure function, not a base class.
 *
 * It computes an index and nothing else. What the control does with the new
 * index - move the active descendant, extend a selection, scroll - is the
 * control's business, and the controls do differ there.
 */

/**
 * The index a navigation key should move a cursor to.
 *
 * @param {string} key The event's key, for example "ArrowDown".
 * @param {number} currentIndex Current cursor index; -1 when there is none.
 * @param {number} length Number of rows.
 * @param {string} [orientation] "vertical" (default) or "horizontal".
 * @returns {number} The new index, or -1 when the key does not navigate.
 */
export function nextIndexForKey(key, currentIndex, length, orientation)
{
    if (length <= 0)
    {
        return -1;
    }

    if (key === "Home")
    {
        return 0;
    }

    if (key === "End")
    {
        return length - 1;
    }

    const step = stepForKey(key, orientation);

    if (step === 0)
    {
        return -1;
    }

    const start = currentIndex < 0 ? 0 : currentIndex;
    const wanted = currentIndex < 0 ? start : start + step;

    return clampIndex(wanted, length);
}

/**
 * The direction an arrow key moves in, for one orientation.
 *
 * @param {string} key
 * @param {string} [orientation] "vertical" (default) or "horizontal".
 * @returns {number} 1, -1, or 0 when the key does not navigate.
 */
export function stepForKey(key, orientation)
{
    const isHorizontal = orientation === "horizontal";

    if (isHorizontal === false && key === "ArrowDown")
    {
        return 1;
    }

    if (isHorizontal === false && key === "ArrowUp")
    {
        return -1;
    }

    if (isHorizontal === true && key === "ArrowRight")
    {
        return 1;
    }

    if (isHorizontal === true && key === "ArrowLeft")
    {
        return -1;
    }

    return 0;
}

/**
 * True when a key moves a cursor in this orientation.
 *
 * @param {string} key
 * @param {string} [orientation]
 * @returns {boolean}
 */
export function isNavigationKey(key, orientation)
{
    if (key === "Home" || key === "End")
    {
        return true;
    }

    return stepForKey(key, orientation) !== 0;
}

/**
 * Restricts an index to the bounds of a list.
 *
 * @param {number} index
 * @param {number} length
 * @returns {number}
 */
export function clampIndex(index, length)
{
    if (length <= 0)
    {
        return -1;
    }

    if (index < 0)
    {
        return 0;
    }

    if (index > length - 1)
    {
        return length - 1;
    }

    return index;
}

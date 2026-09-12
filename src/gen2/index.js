/**
 * GEN 2 - library barrel
 * =============================================================================
 * Re-exports the concrete control library and lists it in one place.
 *
 * This file contains no logic and no registration. It exists so that a page, a
 * test or a Gen-3 module can name the library once, and so that the control
 * inventory has a single machine-readable definition that the architecture
 * checks and the documentation are both compared against.
 *
 * Registration lives in src/app/registerGen2.js, because deciding which tag
 * names a document uses is an application decision, not a library one.
 */

export { Label } from "./Label.js";
export { TextBox } from "./TextBox.js";
export { TextArea } from "./TextArea.js";
export { Button } from "./Button.js";
export { CheckBox } from "./CheckBox.js";
export { RadioGroup } from "./RadioGroup.js";
export { DropDown } from "./DropDown.js";
export { ListBox } from "./ListBox.js";
export { TreeView } from "./TreeView.js";
export { TreeListView } from "./TreeListView.js";
export { ImageView } from "./ImageView.js";
export { Panel } from "./Panel.js";
export { Form } from "./Form.js";
export { DataGrid } from "./DataGrid.js";
export { StatusMeter } from "./StatusMeter.js";

import { Label } from "./Label.js";
import { TextBox } from "./TextBox.js";
import { TextArea } from "./TextArea.js";
import { Button } from "./Button.js";
import { CheckBox } from "./CheckBox.js";
import { RadioGroup } from "./RadioGroup.js";
import { DropDown } from "./DropDown.js";
import { ListBox } from "./ListBox.js";
import { TreeView } from "./TreeView.js";
import { TreeListView } from "./TreeListView.js";
import { ImageView } from "./ImageView.js";
import { Panel } from "./Panel.js";
import { Form } from "./Form.js";
import { DataGrid } from "./DataGrid.js";
import { StatusMeter } from "./StatusMeter.js";

/**
 * Every concrete control in the Gen-2 library, in documentation order.
 * @type {Array<typeof import("../gen1/AbstractElement.js").AbstractElement>}
 */
export const GEN2_CONTROLS =
[
    Label,
    TextBox,
    TextArea,
    Button,
    CheckBox,
    RadioGroup,
    DropDown,
    ListBox,
    TreeView,
    TreeListView,
    ImageView,
    Panel,
    Form,
    DataGrid,
    StatusMeter
];

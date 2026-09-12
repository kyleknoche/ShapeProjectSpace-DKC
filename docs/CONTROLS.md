# The Gen-2 control library

15 controls, each one step below `AbstractElement`, each usable in a project
that has never heard of this one.

Everything below is the public API. You should never need to read a control's
private fields to use it.

## Conventions shared by every control

**Construction.** Controls are custom elements. Create them with
`document.createElement("tg-…")` after `registerGen2Controls()` has run, or write
the tag in HTML. The constructor takes no arguments — custom element
constructors may not, so all configuration is properties or attributes.

**Configuration.** Every attribute has a matching property. Attributes are for
markup, properties are for script, and `configure({ … })` applies several
properties with a single update:

```js
textBox.configure({ label: "Name", required: true, placeholder: "Your name" });
```

An unknown key in `configure()` throws rather than being ignored.

**Owned DOM.** `element.getElement(name)` returns a node the control created.
The names are listed per control below. They are stable for the life of the
element; a control never rebuilds them.

**Lifecycle.** `buildElements()` runs once on first connection. `bindEvents()`
and `syncElements()` run on every connection. Listeners are released on
disconnection and restored on reconnection. Owned DOM survives both.

**Events.** All events are bubbling `CustomEvent`s with a `detail` object.
Shared across the library:

| Event | When |
| --- | --- |
| `tg-connected` | After a connection completes. `{ elementId }` |
| `tg-disconnected` | After listeners are released. Fires on the element only, since it is already detached. |
| `tg-action` | Whenever `performAction()` completes. `{ action, handled, source, detail }` |

**The action seam.** `performAction(payload)` is the public entry point; it calls
the control's `abstractAction()`, normalises the result and emits `tg-action`.
Every user gesture routes through it, so a click and a programmatic call produce
the same state changes and the same events. `handled: false` means "this control
understood you and declined" — disabled, read-only, nothing selected — as opposed
to an error.

**The field contract.** `TextBox`, `TextArea`, `CheckBox`, `RadioGroup`,
`DropDown` and `ListBox` can take part in a `Form`. A field control exposes:

```
get isFieldControl()   → true
get name()             → string
get formValue() / set  → the value
validate()             → { valid, message }
setValidationMessage(text)
```

The contract is duck-typed, so a control from outside this library can join in
and `Form` needs no import of any other control.

---

## Label

`tg-label` · `HTMLElement → AbstractElement → Label`

Text, optionally associated with another control. The smallest complete control
in the library and the reference example for how one is written.

| Attributes | `text`, `for`, `variant`, `muted`, `required` |
| --- | --- |
| Properties | `text`, `htmlFor`, `variant` (`default` \| `caption` \| `heading` \| `field`), `muted`, `required` |
| Methods | `targetElement()` → the element named by `for`, or `null` |
| Owned DOM | `text`, `marker` |
| Events | `tg-action` |

**Abstract action — `activate`.** Moves focus to the associated control, which is
what a label is for. With no association it reports `handled: false` rather than
inventing a meaning.

**Specialise it for** a readout bound to application state. See
`ShapeStatusLabel`.

---

## TextBox

`tg-text-box` · `HTMLElement → AbstractElement → TextBox`

Single-line text entry with a label, a hint line and validation reporting. Wraps
a native input so autofill, input methods and mobile keyboards keep working.

| Attributes | `label`, `value`, `placeholder`, `hint`, `name`, `type`, `maxlength`, `pattern`, `disabled`, `readonly`, `required` |
| --- | --- |
| Properties | `label`, `value`, `draftValue`, `placeholder`, `hint`, `name`, `type`, `maxLength`, `pattern`, `disabled`, `readOnly`, `required`, `invalid`, `validationMessage` |
| Methods | `focus()`, `select()`, `clear()`, `commit()`, `validate()`, `setValidationMessage(text)` |
| Owned DOM | `label`, `input`, `hint` |
| Events | `tg-input` `{ value, name }`, `tg-change` `{ value, previousValue, name }`, `tg-action` |

`value` is the **committed** value; `draftValue` is what is currently typed.
Typing changes only the draft, and never emits `tg-change`.

**Abstract action — `commit`.** Accepts the typed text as the value. Typing is
not the act; accepting it is. `Enter`, a blur with a changed draft, and
`commit()` all route through here, so exactly one code path can change a
committed value. A read-only or disabled box reports `handled: false`.

---

## TextArea

`tg-text-area` · `HTMLElement → AbstractElement → TextArea`

Multi-line entry with an optional character counter. A sibling of `TextBox`, not
a subclass: the two share an idea, not an implementation.

| Attributes | `label`, `value`, `placeholder`, `hint`, `name`, `rows`, `maxlength`, `disabled`, `readonly`, `required`, `autogrow` |
| --- | --- |
| Properties | as `TextBox`, plus `rows`, `autoGrow` |
| Methods | `focus()`, `select()`, `clear()`, `commit()`, `validate()`, `setValidationMessage(text)` |
| Owned DOM | `label`, `input`, `footer`, `hint`, `counter` |
| Events | `tg-input` `{ value, name, length }`, `tg-change`, `tg-action` |

**Abstract action — `commit`.** As `TextBox`. `Enter` inserts a newline in a text
area, so the keyboard commit gesture is `Ctrl+Enter` or `Cmd+Enter`.

---

## Button

`tg-button` · `HTMLElement → AbstractElement → Button`

A command. Wraps a real native button, so keyboard activation and assistive
technology support come from the platform.

| Attributes | `text`, `variant`, `size`, `disabled`, `busy`, `command` |
| --- | --- |
| Properties | `text`, `variant` (`default` \| `primary` \| `subtle` \| `danger`), `size` (`medium` \| `small`), `disabled`, `busy`, `command` |
| Methods | `focus()`, `invoke(payload)` |
| Owned DOM | `button`, `caption`, `spinner` |
| Events | `tg-action` `{ command, text, payload }` |

`command` is an opaque string echoed back in the action detail. It lets one
listener route many buttons without a listener per button; the control gallery
uses exactly that.

**Abstract action — `invoke`.** The command this button represents. A disabled or
busy button still answers, reporting `handled: false`.

---

## CheckBox

`tg-check-box` · `HTMLElement → AbstractElement → CheckBox`

A two-state or three-state checkbox with a label and optional description.

| Attributes | `label`, `description`, `name`, `value`, `checked`, `indeterminate`, `disabled`, `required` |
| --- | --- |
| Properties | `label`, `description`, `name`, `value`, `checked`, `indeterminate`, `disabled`, `required`, `invalid`, `validationMessage` |
| Methods | `focus()`, `toggle()`, `check()`, `uncheck()`, `validate()`, `setValidationMessage(text)` |
| Owned DOM | `input`, `label`, `caption`, `description` |
| Events | `tg-change` `{ checked, value, name }`, `tg-action` |

Assigning `checked` is a state assignment and emits nothing. `toggle()`,
`check()` and `uncheck()` express intent and emit.

**Abstract action — `toggle`.** The single path that changes `checked` in
response to intent. A payload of `{ checked: true|false }` sets a specific state
instead of inverting, which is what the native change event supplies — so a
click and a programmatic `toggle()` produce an identical sequence.

---

## RadioGroup

`tg-radio-group` · `HTMLElement → AbstractElement → RadioGroup`

A mutually exclusive set of options. The group is the control; a lone radio has
no meaning, so there is no separate RadioButton class.

```js
group.items =
[
    { value: "one", label: "One", description: "Optional", disabled: false }
];
```

| Attributes | `label`, `name`, `value`, `orientation`, `disabled`, `required` |
| --- | --- |
| Properties | `label`, `name`, `value`, `items`, `orientation` (`vertical` \| `horizontal`), `disabled`, `required`, `selectedItem`, `invalid`, `validationMessage` |
| Methods | `selectValue(v)`, `clearSelection()`, `getItem(v)`, `focus()`, `validate()`, `setValidationMessage(text)` |
| Owned DOM | `legend`, `list`, `message` |
| Events | `tg-change` `{ value, previousValue, item, name }`, `tg-action` |

Option rows are reconciled by value: changing `items` reuses the rows whose
values survive.

**Abstract action — `select`.** Chooses one option. The payload carries
`{ value }`; without one the current value is re-affirmed, which distinguishes a
programmatic no-op from a change.

---

## DropDown

`tg-drop-down` · `HTMLElement → AbstractElement → DropDown`

Single-selection picker backed by a native `select`, so typed navigation, popup
placement and mobile pickers are the platform's.

| Attributes | `label`, `name`, `value`, `placeholder`, `hint`, `disabled`, `required` |
| --- | --- |
| Properties | `label`, `name`, `value`, `items`, `placeholder`, `hint`, `disabled`, `required`, `selectedItem`, `invalid`, `validationMessage` |
| Methods | `selectValue(v)`, `getItem(v)`, `focus()`, `validate()`, `setValidationMessage(text)` |
| Owned DOM | `label`, `shell`, `select`, `marker`, `hint` |
| Events | `tg-change` `{ value, previousValue, item, name }`, `tg-action` |

**Abstract action — `select`.** Commits a choice. The native change event is
translated into a payload and routed here, so the picker has one path into its
value like every other control.

---

## ListBox

`tg-list-box` · `HTMLElement → AbstractElement → ListBox`

A selectable list with keyboard navigation, single or multiple selection, an
empty state and a horizontal mode.

```js
listBox.items =
[
    { value: "a", label: "Alpha", description: "…", badge: "3", disabled: false }
];
```

| Attributes | `label`, `value`, `name`, `selection-mode`, `orientation`, `empty-text`, `disabled`, `activate-on-select`, `required` |
| --- | --- |
| Properties | `items`, `value`, `values`, `selectedValues`, `selectedItems`, `activeValue`, `selectionMode` (`single` \| `multiple` \| `none`), `orientation`, `emptyText`, `disabled`, `activateOnSelect`, `label`, `name`, `required` |
| Methods | `selectValue(v)`, `toggleValue(v)`, `selectValues(list)`, `clearSelection()`, `activateValue(v)`, `focusValue(v)`, `getItem(v)`, `indexOfValue(v)`, `focus()`, `validate()` |
| Owned DOM | `caption`, `list`, `empty`, `message` |
| Events | `tg-change` `{ value, values, item, items, name }`, `tg-highlight` `{ value, item }`, `tg-action` |

**Focus model.** The list container is the single focusable element and names the
current row with `aria-activedescendant`. A data update therefore cannot move
focus out of the control.

**Keyboard.** Arrow keys (orientation-aware), `Home`, `End`, `Enter`/`Space` to
activate. `Ctrl`/`Cmd`+click extends a multiple selection.

**Abstract action — `activate`.** Open, run or commit the current item.
Selection and activation are deliberately different: selecting says which one you
mean, activating says do something with it. Set `activateOnSelect` when a single
click should do both.

**Specialise it for** any application list with selection semantics. See
`ShapeBookshelf`.

---

## TreeView

`tg-tree-view` · `HTMLElement → AbstractElement → TreeView`

A hierarchy with expandable branches, selection and full keyboard navigation.

```js
tree.nodes =
[
    { id: "root", label: "Root", badge: "4", icon: "*", expanded: true,
      children: [ { id: "child", label: "Child" } ] }
];
```

| Attributes | `label`, `selected-id`, `disabled`, `show-guides`, `empty-text` |
| --- | --- |
| Properties | `nodes`, `selectedId`, `activeId`, `expandedIds`, `selectedNode`, `label`, `disabled`, `showGuides`, `emptyText` |
| Methods | `setNodes(list)`, `getNode(id)`, `getParentId(id)`, `expand(id)`, `collapse(id)`, `toggleNode(id)`, `expandAll()`, `collapseAll()`, `selectNode(id)`, `revealNode(id)`, `activateNode(id)`, `visibleNodeIds()`, `focus()` |
| Owned DOM | `caption`, `viewport`, `empty` |
| Events | `tg-change` `{ id, node, previousId }`, `tg-expand` `{ id, node }`, `tg-collapse` `{ id, node }`, `tg-action` |

**Rendering.** Visible nodes are flattened into one flat row list and reconciled
by node id, so expanding a branch inserts rows and leaves every other row node
alone. Indentation comes from a CSS custom property, not nested containers, so a
node that changes depth keeps its row. Duplicate ids are refused.

Expansion state survives `setNodes()` for ids that still exist.

**Abstract action — `activate`.** Opens the current node, and also toggles it if
it is a branch — what a file tree in an editor does.

---

## TreeListView

`tg-tree-list-view` · `HTMLElement → AbstractElement → TreeListView`

A tree and a list in one: hierarchical rows displayed across columns. For
hierarchies whose items have attributes worth showing side by side.

```js
view.columns =
[
    { key: "label", title: "Name", width: "40%" },
    { key: "count", title: "Items", align: "right", format: formatCount }
];
```

| Attributes | `label`, `selected-id`, `tree-column`, `disabled`, `show-header`, `empty-text` |
| --- | --- |
| Properties | `columns`, `nodes`, `selectedId`, `activeId`, `expandedIds`, `treeColumnKey`, `showHeader`, `disabled`, `emptyText`, `selectedNode` |
| Methods | `setColumns(list)`, `setNodes(list)`, `getNode(id)`, `getParentId(id)`, `expand(id)`, `collapse(id)`, `toggleNode(id)`, `expandAll()`, `collapseAll()`, `selectNode(id)`, `revealNode(id)`, `activateNode(id)`, `visibleNodeIds()`, `cellValue(node, column)`, `focus()` |
| Owned DOM | `caption`, `viewport`, `table`, `head`, `headRow`, `body`, `empty` |
| Events | `tg-change`, `tg-expand`, `tg-collapse`, `tg-action` |

A real table with `treegrid` semantics. **Rows are reconciled by node id and
cells by column key**, so changing the data, the columns or the expansion state
each preserves the identity of whatever survives.

A column may carry a `format(value, node)` function. It must be a named function
owned by the caller, never an inline closure.

A sibling of `TreeView`, not a subclass. What they share is `HierarchyModel`, a
plain object in `src/gen2/support/` with no DOM and no events.

**Abstract action — `activate`.** Opens the current row, toggling it when it is a
branch, so the two hierarchy controls behave identically under the same gesture.

---

## ImageView

`tg-image` · `HTMLElement → AbstractElement → ImageView`

A figure with a load state: a placeholder before a source resolves, a caption
underneath, and a readable message instead of a broken-image glyph on failure.

The class is `ImageView` rather than `Image` because `Image` is a global
constructor in every browser and a module importing a class of that name would
silently shadow it. The tag is still `tg-image`.

| Attributes | `src`, `alt`, `caption`, `fit`, `ratio`, `placeholder-text`, `lazy` |
| --- | --- |
| Properties | `src`, `alt`, `caption`, `fit` (`contain` \| `cover`), `ratio`, `placeholderText`, `lazy`, `loadState` (`idle` \| `loading` \| `loaded` \| `error`) |
| Methods | `resolve()`, `naturalSize()` |
| Owned DOM | `figure`, `frame`, `picture`, `placeholder`, `caption` |
| Events | `tg-load` `{ src, width, height }`, `tg-error` `{ src }`, `tg-action` |

**Abstract action — `resolve`.** Turns a source into a displayed picture. Setting
`src` on a connected element resolves automatically; `resolve()` retries. With
no source it reports `handled: false`.

---

## Panel

`tg-panel` · `HTMLElement → AbstractElement → Panel`

A titled region with an optional collapse control, a toolbar slot and a footer.
The container the rest of a layout is built from.

| Attributes | `heading`, `subheading`, `variant`, `collapsible`, `collapsed`, `padded`, `flush` |
| --- | --- |
| Properties | `heading`, `subheading`, `variant` (`default` \| `quiet` \| `inset`), `collapsible`, `collapsed`, `padded`, `flush` |
| Methods | `expand()`, `collapse()`, `toggleCollapsed()`, `setContent(node)`, `appendContent(node)`, `clearContent()`, `setToolbar(node)`, `setFooter(node)` |
| Owned DOM | `header`, `headings`, `title`, `subtitle`, `toolbar`, `toggle`, `body`, `footer` |
| Events | `tg-toggle` `{ collapsed, heading }`, `tg-action` |

**Authored children are adopted, not discarded.** Markup written inside the
element is *moved* into the body container on first build, so references held
elsewhere stay valid:

```html
<tg-panel heading="Notes">
    <p>This paragraph becomes the panel body.</p>
</tg-panel>
```

**Abstract action — `toggle`.** Shows or hides the body. A panel that is not
collapsible reports `handled: false` rather than pretending to act.

**Specialise it for** any application region with a heading. See `ShapeBoard` and
`ShapeSectionReader`, both of which add their own act to the seam while keeping
the inherited toggle.

---

## Form

`tg-form` · `HTMLElement → AbstractElement → Form`

Composition: gathers the field controls placed inside it, validates them
together, collects their values and reports a submission.

| Attributes | `heading`, `description`, `submit-text`, `reset-text`, `notice`, `notice-state`, `show-reset`, `busy`, `disabled` |
| --- | --- |
| Properties | `heading`, `description`, `submitText`, `resetText`, `showReset`, `busy`, `disabled`, `noticeText`, `noticeState` (`info` \| `success` \| `warning` \| `error`) |
| Methods | `fields()`, `fieldNamed(name)`, `getValues()`, `setValues(object)`, `validate()`, `reset()`, `submit()`, `setFieldError(name, message)`, `clearErrors()`, `appendField(node)` |
| Owned DOM | `form`, `header`, `title`, `description`, `body`, `notice`, `actions`, `submit`, `reset` |
| Events | `tg-submit` (cancelable) `{ values, fieldCount }`, `tg-invalid` `{ errors }`, `tg-reset` `{ values }`, `tg-action` |

Fields are discovered by the field contract described at the top of this
document, not by registration — so `Form` imports no other control, and a field
inside a nested form belongs to that form rather than this one. `validate()`
reports every failure, not just the first. `reset()` restores the values the form
was connected with.

Like `Panel`, authored children are moved into the body on first build.

**Abstract action — `submit`.** Validates every field and, if they all pass,
announces the collected values. A form that fails validation reports
`handled: false` with `reason: "invalid"` and emits `tg-invalid`, so a caller
always learns which of the two happened.

---

## DataGrid

`tg-data-grid` · `HTMLElement → AbstractElement → DataGrid`

A tabular view of records with sortable columns, row selection, keyboard
navigation and an empty state. Flat on purpose; hierarchy is `TreeListView`'s job.

```js
grid.rowKey = "id";
grid.columns = [ { key: "size", title: "Size", align: "right", sortable: true, format: formatBytes } ];
grid.rows = [ { id: "a", size: 1024 } ];
```

| Attributes | `label`, `row-key`, `selection-mode`, `sort-key`, `sort-direction`, `empty-text`, `striped`, `disabled` |
| --- | --- |
| Properties | `columns`, `rows`, `rowKey`, `selectionMode`, `selectedKey`, `selectedKeys`, `selectedRow`, `selectedRows`, `activeKey`, `sortKey`, `sortDirection`, `emptyText`, `striped`, `disabled`, `label` |
| Methods | `setColumns(list)`, `setRows(list)`, `sortBy(key, direction)`, `getRow(key)`, `selectRow(key)`, `toggleRow(key)`, `clearSelection()`, `activateRow(key)`, `displayedRows()`, `cellValue(row, column)`, `focus()` |
| Owned DOM | `caption`, `viewport`, `table`, `head`, `headRow`, `body`, `empty`, `status` |
| Events | `tg-sort` `{ key, direction }`, `tg-change` `{ key, keys, row, rows }`, `tg-action` |

**Sorting is a view concern.** It is performed on a copy; the rows array you
supplied is never reordered. A column may supply a named `compare(left, right)`;
otherwise numbers sort numerically and everything else sorts as case-insensitive
natural text. `sortBy(key)` with no direction reverses the current one.

Rows are reconciled by row key, so sorting moves row nodes rather than rebuilding
them, and a selection survives `setRows()` if its key does.

**Abstract action — `activate`.** Opens the current row. Selection says which
record you mean; activation says do something with it. Double click or `Enter`
activates; `Space` toggles a selection.

---

## StatusMeter

`tg-status-meter` · `HTMLElement → AbstractElement → StatusMeter`

A progress bar and a status line in one: how far along something is, what state
it is in, and what it has to say about itself.

| Attributes | `label`, `value`, `max`, `state`, `message`, `indeterminate`, `show-value`, `dismissible` |
| --- | --- |
| Properties | `label`, `value`, `max`, `state` (`idle` \| `busy` \| `success` \| `warning` \| `error`), `message`, `indeterminate`, `showValue`, `dismissible`, `percent` |
| Methods | `setProgress(value, max)`, `advance(amount)`, `report(state, message)`, `reset()`, `acknowledge()`, `snapshot()` |
| Owned DOM | `header`, `caption`, `readout`, `track`, `bar`, `footer`, `message`, `dismiss` |
| Events | `tg-progress` `{ value, max, percent }`, `tg-status` `{ state, message, previousState }`, `tg-action` |

Progress is clamped to the range. `snapshot()` returns the whole state as plain
data.

**Abstract action — `acknowledge`.** This is the hardest control in the library
to give an honest act, and it is worth saying why. A meter mostly reports; it
does not obviously do anything. The act chosen is *acknowledge*: take notice of
the current status and, when the control is `dismissible`, clear it. That is a
real operation with a real effect and a real gesture behind it — the dismiss
button — rather than a method that exists to satisfy a base class. A meter that
is not dismissible reports `handled: false` and returns the snapshot anyway. See
decision 4 in [DECISIONS.md](DECISIONS.md).

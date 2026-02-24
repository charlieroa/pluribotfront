// ─── UI Component Library ───
// shadcn/ui-style components as pure JavaScript (React.createElement)
// Injected into the HTML before user code. Registered on window.__UI.
// Uses semantic HSL tokens from :root CSS variables.

export const UI_COMPONENTS_SOURCE = `(function() {
  var cn = function() {
    var r = '';
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      if (!a) continue;
      if (typeof a === 'string') r += (r ? ' ' : '') + a;
      else if (Array.isArray(a)) { var s = cn.apply(null, a); if (s) r += (r ? ' ' : '') + s; }
      else if (typeof a === 'object') { for (var k in a) if (a[k]) r += (r ? ' ' : '') + k; }
    }
    return r;
  };

  var h = React.createElement;
  var fRef = React.forwardRef;

  // ─── Layout ───

  var Card = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('div', Object.assign({ ref: ref, className: cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className) }, rest));
  });
  Card.displayName = 'Card';

  var CardHeader = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('div', Object.assign({ ref: ref, className: cn('flex flex-col space-y-1.5 p-6', className) }, rest));
  });
  CardHeader.displayName = 'CardHeader';

  var CardTitle = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('h3', Object.assign({ ref: ref, className: cn('text-2xl font-semibold leading-none tracking-tight', className) }, rest));
  });
  CardTitle.displayName = 'CardTitle';

  var CardDescription = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('p', Object.assign({ ref: ref, className: cn('text-sm text-muted-foreground', className) }, rest));
  });
  CardDescription.displayName = 'CardDescription';

  var CardContent = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('div', Object.assign({ ref: ref, className: cn('p-6 pt-0', className) }, rest));
  });
  CardContent.displayName = 'CardContent';

  var CardFooter = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('div', Object.assign({ ref: ref, className: cn('flex items-center p-6 pt-0', className) }, rest));
  });
  CardFooter.displayName = 'CardFooter';

  var Separator = fRef(function(props, ref) {
    var className = props.className, orientation = props.orientation || 'horizontal', rest = Object.assign({}, props);
    delete rest.className; delete rest.orientation;
    var isH = orientation === 'horizontal';
    return h('div', Object.assign({ ref: ref, role: 'separator', 'aria-orientation': orientation, className: cn('shrink-0 bg-border', isH ? 'h-[1px] w-full' : 'h-full w-[1px]', className) }, rest));
  });
  Separator.displayName = 'Separator';

  // ─── Forms ───

  var buttonVariants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };
  var buttonSizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  };

  var Button = fRef(function(props, ref) {
    var className = props.className, variant = props.variant || 'default', size = props.size || 'default', asChild = props.asChild, rest = Object.assign({}, props);
    delete rest.className; delete rest.variant; delete rest.size; delete rest.asChild;
    var cls = cn('inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', buttonVariants[variant] || buttonVariants.default, buttonSizes[size] || buttonSizes.default, className);
    return h('button', Object.assign({ ref: ref, className: cls }, rest));
  });
  Button.displayName = 'Button';

  var Input = fRef(function(props, ref) {
    var className = props.className, type = props.type || 'text', rest = Object.assign({}, props);
    delete rest.className;
    return h('input', Object.assign({ ref: ref, type: type, className: cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className) }, rest));
  });
  Input.displayName = 'Input';

  var Label = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('label', Object.assign({ ref: ref, className: cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className) }, rest));
  });
  Label.displayName = 'Label';

  var Textarea = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('textarea', Object.assign({ ref: ref, className: cn('flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className) }, rest));
  });
  Textarea.displayName = 'Textarea';

  // ─── Select (simple native wrapper) ───

  var Select = function(props) {
    var _s = React.useState(props.defaultValue || props.value || '');
    var val = _s[0], setVal = _s[1];
    React.useEffect(function() { if (props.value !== undefined) setVal(props.value); }, [props.value]);
    return h(React.Fragment, null, React.Children.map(props.children, function(child) {
      if (!child) return null;
      return React.cloneElement(child, { _value: val, _onChange: function(v) { setVal(v); if (props.onValueChange) props.onValueChange(v); } });
    }));
  };

  var SelectTrigger = fRef(function(props, ref) {
    var className = props.className, children = props.children, _value = props._value, rest = Object.assign({}, props);
    delete rest.className; delete rest.children; delete rest._value; delete rest._onChange;
    return h('button', Object.assign({ ref: ref, type: 'button', className: cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className) }, rest), children);
  });
  SelectTrigger.displayName = 'SelectTrigger';

  var SelectValue = function(props) {
    return h('span', null, props._value || props.placeholder || '');
  };

  var SelectContent = function(props) {
    return h('div', { className: cn('relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md', props.className) }, props.children);
  };

  var SelectItem = function(props) {
    var value = props.value, children = props.children, className = props.className, _onChange = props._onChange;
    return h('div', {
      className: cn('relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground', className),
      onClick: function() { if (_onChange) _onChange(value); },
    }, children);
  };

  var Checkbox = fRef(function(props, ref) {
    var className = props.className, checked = props.checked, onCheckedChange = props.onCheckedChange, rest = Object.assign({}, props);
    delete rest.className; delete rest.checked; delete rest.onCheckedChange;
    return h('button', Object.assign({
      ref: ref, type: 'button', role: 'checkbox', 'aria-checked': !!checked,
      className: cn('peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', checked && 'bg-primary text-primary-foreground', className),
      onClick: function() { if (onCheckedChange) onCheckedChange(!checked); },
    }, rest), checked ? h('svg', { className: 'h-3 w-3', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 3 }, h('path', { d: 'M20 6L9 17l-5-5' })) : null);
  });
  Checkbox.displayName = 'Checkbox';

  var Switch = fRef(function(props, ref) {
    var className = props.className, checked = props.checked, onCheckedChange = props.onCheckedChange, rest = Object.assign({}, props);
    delete rest.className; delete rest.checked; delete rest.onCheckedChange;
    return h('button', Object.assign({
      ref: ref, type: 'button', role: 'switch', 'aria-checked': !!checked,
      className: cn('peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', checked ? 'bg-primary' : 'bg-input', className),
      onClick: function() { if (onCheckedChange) onCheckedChange(!checked); },
    }, rest), h('span', { className: cn('pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform', checked ? 'translate-x-5' : 'translate-x-0') }));
  });
  Switch.displayName = 'Switch';

  var Slider = fRef(function(props, ref) {
    var className = props.className, value = props.value || [50], min = props.min || 0, max = props.max || 100, step = props.step || 1, onValueChange = props.onValueChange;
    var pct = ((value[0] - min) / (max - min)) * 100;
    return h('div', { ref: ref, className: cn('relative flex w-full touch-none select-none items-center', className) },
      h('div', { className: 'relative h-2 w-full grow overflow-hidden rounded-full bg-secondary' },
        h('div', { className: 'absolute h-full bg-primary', style: { width: pct + '%' } })
      ),
      h('input', {
        type: 'range', min: min, max: max, step: step, value: value[0],
        className: 'absolute inset-0 h-full w-full cursor-pointer opacity-0',
        onChange: function(e) { if (onValueChange) onValueChange([Number(e.target.value)]); },
      })
    );
  });
  Slider.displayName = 'Slider';

  // ─── Feedback ───

  var Badge = fRef(function(props, ref) {
    var className = props.className, variant = props.variant || 'default', rest = Object.assign({}, props);
    delete rest.className; delete rest.variant;
    var variants = {
      default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      outline: 'text-foreground',
    };
    return h('div', Object.assign({ ref: ref, className: cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', variants[variant] || variants.default, className) }, rest));
  });
  Badge.displayName = 'Badge';

  var Alert = fRef(function(props, ref) {
    var className = props.className, variant = props.variant || 'default', rest = Object.assign({}, props);
    delete rest.className; delete rest.variant;
    var variants = {
      default: 'bg-background text-foreground',
      destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    };
    return h('div', Object.assign({ ref: ref, role: 'alert', className: cn('relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground', variants[variant] || variants.default, className) }, rest));
  });
  Alert.displayName = 'Alert';

  var AlertTitle = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('h5', Object.assign({ ref: ref, className: cn('mb-1 font-medium leading-none tracking-tight', className) }, rest));
  });
  AlertTitle.displayName = 'AlertTitle';

  var AlertDescription = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('div', Object.assign({ ref: ref, className: cn('text-sm [&_p]:leading-relaxed', className) }, rest));
  });
  AlertDescription.displayName = 'AlertDescription';

  var Progress = fRef(function(props, ref) {
    var className = props.className, value = props.value || 0, rest = Object.assign({}, props);
    delete rest.className; delete rest.value;
    return h('div', Object.assign({ ref: ref, className: cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className) }, rest),
      h('div', { className: 'h-full w-full flex-1 bg-primary transition-all', style: { transform: 'translateX(-' + (100 - value) + '%)' } })
    );
  });
  Progress.displayName = 'Progress';

  var Skeleton = function(props) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('div', Object.assign({ className: cn('animate-pulse rounded-md bg-muted', className) }, rest));
  };

  // ─── Overlay ───

  var Dialog = function(props) {
    var _s = React.useState(props.defaultOpen || false);
    var open = props.open !== undefined ? props.open : _s[0];
    var setOpen = props.onOpenChange || _s[1];
    return h(React.Fragment, null, React.Children.map(props.children, function(child) {
      if (!child) return null;
      return React.cloneElement(child, { _open: open, _setOpen: setOpen });
    }));
  };

  var DialogTrigger = function(props) {
    var children = props.children, _setOpen = props._setOpen, asChild = props.asChild;
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, { onClick: function() { if (_setOpen) _setOpen(true); } });
    }
    return h('button', { type: 'button', onClick: function() { if (_setOpen) _setOpen(true); } }, children);
  };

  var DialogContent = fRef(function(props, ref) {
    var className = props.className, children = props.children, _open = props._open, _setOpen = props._setOpen, rest = Object.assign({}, props);
    delete rest.className; delete rest.children; delete rest._open; delete rest._setOpen;
    if (!_open) return null;
    return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center' },
      h('div', { className: 'fixed inset-0 bg-black/80', onClick: function() { if (_setOpen) _setOpen(false); } }),
      h('div', Object.assign({ ref: ref, className: cn('fixed z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg', className) }, rest),
        children,
        h('button', {
          className: 'absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100',
          onClick: function() { if (_setOpen) _setOpen(false); },
        }, h('svg', { className: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('path', { d: 'M18 6L6 18M6 6l12 12' })))
      )
    );
  });
  DialogContent.displayName = 'DialogContent';

  var DialogHeader = function(props) {
    return h('div', { className: cn('flex flex-col space-y-1.5 text-center sm:text-left', props.className) }, props.children);
  };
  var DialogTitle = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('h2', Object.assign({ ref: ref, className: cn('text-lg font-semibold leading-none tracking-tight', className) }, rest));
  });
  DialogTitle.displayName = 'DialogTitle';
  var DialogDescription = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('p', Object.assign({ ref: ref, className: cn('text-sm text-muted-foreground', className) }, rest));
  });
  DialogDescription.displayName = 'DialogDescription';
  var DialogFooter = function(props) {
    return h('div', { className: cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', props.className) }, props.children);
  };

  // Sheet (side drawer)
  var Sheet = function(props) {
    var _s = React.useState(false);
    var open = props.open !== undefined ? props.open : _s[0];
    var setOpen = props.onOpenChange || _s[1];
    return h(React.Fragment, null, React.Children.map(props.children, function(child) {
      if (!child) return null;
      return React.cloneElement(child, { _open: open, _setOpen: setOpen, _side: props.side || 'right' });
    }));
  };

  var SheetTrigger = function(props) {
    var children = props.children, _setOpen = props._setOpen;
    return h('button', { type: 'button', onClick: function() { if (_setOpen) _setOpen(true); } }, children);
  };

  var SheetContent = fRef(function(props, ref) {
    var className = props.className, children = props.children, _open = props._open, _setOpen = props._setOpen, side = props.side || props._side || 'right';
    if (!_open) return null;
    var sideClasses = { left: 'inset-y-0 left-0 w-3/4 sm:max-w-sm border-r', right: 'inset-y-0 right-0 w-3/4 sm:max-w-sm border-l', top: 'inset-x-0 top-0 border-b', bottom: 'inset-x-0 bottom-0 border-t' };
    return h('div', { className: 'fixed inset-0 z-50' },
      h('div', { className: 'fixed inset-0 bg-black/80', onClick: function() { if (_setOpen) _setOpen(false); } }),
      h('div', { ref: ref, className: cn('fixed z-50 gap-4 bg-background p-6 shadow-lg transition-transform', sideClasses[side] || sideClasses.right, className) },
        children,
        h('button', {
          className: 'absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100',
          onClick: function() { if (_setOpen) _setOpen(false); },
        }, h('svg', { className: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('path', { d: 'M18 6L6 18M6 6l12 12' })))
      )
    );
  });
  SheetContent.displayName = 'SheetContent';

  // ─── Data ───

  var Table = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('div', { className: 'relative w-full overflow-auto' },
      h('table', Object.assign({ ref: ref, className: cn('w-full caption-bottom text-sm', className) }, rest))
    );
  });
  Table.displayName = 'Table';

  var TableHeader = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('thead', Object.assign({ ref: ref, className: cn('[&_tr]:border-b', className) }, rest));
  });
  TableHeader.displayName = 'TableHeader';

  var TableBody = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('tbody', Object.assign({ ref: ref, className: cn('[&_tr:last-child]:border-0', className) }, rest));
  });
  TableBody.displayName = 'TableBody';

  var TableRow = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('tr', Object.assign({ ref: ref, className: cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className) }, rest));
  });
  TableRow.displayName = 'TableRow';

  var TableHead = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('th', Object.assign({ ref: ref, className: cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0', className) }, rest));
  });
  TableHead.displayName = 'TableHead';

  var TableCell = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('td', Object.assign({ ref: ref, className: cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className) }, rest));
  });
  TableCell.displayName = 'TableCell';

  // ─── Navigation: Tabs ───

  var Tabs = function(props) {
    var _s = React.useState(props.defaultValue || '');
    var value = props.value !== undefined ? props.value : _s[0];
    var setValue = props.onValueChange || _s[1];
    return h('div', { className: cn('', props.className) }, React.Children.map(props.children, function(child) {
      if (!child) return null;
      return React.cloneElement(child, { _value: value, _setValue: setValue });
    }));
  };

  var TabsList = fRef(function(props, ref) {
    var className = props.className, children = props.children, _value = props._value, _setValue = props._setValue, rest = Object.assign({}, props);
    delete rest.className; delete rest.children; delete rest._value; delete rest._setValue;
    return h('div', Object.assign({ ref: ref, className: cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className) }, rest),
      React.Children.map(children, function(child) {
        if (!child) return null;
        return React.cloneElement(child, { _value: _value, _setValue: _setValue });
      })
    );
  });
  TabsList.displayName = 'TabsList';

  var TabsTrigger = fRef(function(props, ref) {
    var className = props.className, value = props.value, children = props.children, _value = props._value, _setValue = props._setValue, rest = Object.assign({}, props);
    delete rest.className; delete rest.value; delete rest.children; delete rest._value; delete rest._setValue;
    var active = _value === value;
    return h('button', Object.assign({
      ref: ref, type: 'button',
      className: cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', active && 'bg-background text-foreground shadow-sm', className),
      onClick: function() { if (_setValue) _setValue(value); },
    }, rest), children);
  });
  TabsTrigger.displayName = 'TabsTrigger';

  var TabsContent = fRef(function(props, ref) {
    var className = props.className, value = props.value, _value = props._value, rest = Object.assign({}, props);
    delete rest.className; delete rest.value; delete rest._value; delete rest._setValue;
    if (_value !== value) return null;
    return h('div', Object.assign({ ref: ref, className: cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className) }, rest));
  });
  TabsContent.displayName = 'TabsContent';

  // ─── Avatar ───

  var Avatar = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('span', Object.assign({ ref: ref, className: cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className) }, rest));
  });
  Avatar.displayName = 'Avatar';

  var AvatarImage = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    var _s = React.useState(false), err = _s[0], setErr = _s[1];
    if (err) return null;
    return h('img', Object.assign({ ref: ref, className: cn('aspect-square h-full w-full object-cover', className), onError: function() { setErr(true); } }, rest));
  });
  AvatarImage.displayName = 'AvatarImage';

  var AvatarFallback = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('span', Object.assign({ ref: ref, className: cn('flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium', className) }, rest));
  });
  AvatarFallback.displayName = 'AvatarFallback';

  // ─── Tooltip ───

  var Tooltip = function(props) {
    return h(React.Fragment, null, props.children);
  };
  var TooltipProvider = function(props) {
    return h(React.Fragment, null, props.children);
  };
  var TooltipTrigger = fRef(function(props, ref) {
    var rest = Object.assign({}, props);
    return h('span', Object.assign({ ref: ref }, rest));
  });
  TooltipTrigger.displayName = 'TooltipTrigger';
  var TooltipContent = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('div', Object.assign({ ref: ref, role: 'tooltip', className: cn('z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md', className) }, rest));
  });
  TooltipContent.displayName = 'TooltipContent';

  // ─── AspectRatio ───

  var AspectRatio = fRef(function(props, ref) {
    var ratio = props.ratio || 16/9, className = props.className, children = props.children;
    return h('div', { ref: ref, style: { position: 'relative', width: '100%', paddingBottom: (100 / ratio) + '%' }, className: className },
      h('div', { style: { position: 'absolute', inset: 0 } }, children)
    );
  });
  AspectRatio.displayName = 'AspectRatio';

  // ─── ScrollArea ───

  var ScrollArea = fRef(function(props, ref) {
    var className = props.className, rest = Object.assign({}, props);
    delete rest.className;
    return h('div', Object.assign({ ref: ref, className: cn('relative overflow-auto', className), style: Object.assign({ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }, props.style) }, rest));
  });
  ScrollArea.displayName = 'ScrollArea';

  // ─── Accordion ───

  var Accordion = function(props) {
    var _s = React.useState(props.defaultValue || (props.type === 'multiple' ? [] : ''));
    var value = props.value !== undefined ? props.value : _s[0];
    var setValue = props.onValueChange || _s[1];
    var type = props.type || 'single';
    return h('div', { className: cn('', props.className) }, React.Children.map(props.children, function(child) {
      if (!child) return null;
      return React.cloneElement(child, { _value: value, _setValue: setValue, _type: type });
    }));
  };

  var AccordionItem = fRef(function(props, ref) {
    var className = props.className, value = props.value, children = props.children, _value = props._value, _setValue = props._setValue, _type = props._type;
    var isOpen = _type === 'multiple' ? (Array.isArray(_value) && _value.includes(value)) : _value === value;
    return h('div', { ref: ref, className: cn('border-b', className) },
      React.Children.map(children, function(child) {
        if (!child) return null;
        return React.cloneElement(child, { _isOpen: isOpen, _value: value, _parentValue: _value, _setValue: _setValue, _type: _type });
      })
    );
  });
  AccordionItem.displayName = 'AccordionItem';

  var AccordionTrigger = fRef(function(props, ref) {
    var className = props.className, children = props.children, _isOpen = props._isOpen, _value = props._value, _parentValue = props._parentValue, _setValue = props._setValue, _type = props._type;
    return h('h3', { className: 'flex' },
      h('button', {
        ref: ref, type: 'button',
        className: cn('flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180', className),
        'data-state': _isOpen ? 'open' : 'closed',
        onClick: function() {
          if (!_setValue) return;
          if (_type === 'multiple') {
            var arr = Array.isArray(_parentValue) ? _parentValue.slice() : [];
            var idx = arr.indexOf(_value);
            if (idx >= 0) arr.splice(idx, 1); else arr.push(_value);
            _setValue(arr);
          } else {
            _setValue(_isOpen ? '' : _value);
          }
        },
      },
        children,
        h('svg', { className: 'h-4 w-4 shrink-0 transition-transform duration-200', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('path', { d: 'M6 9l6 6 6-6' }))
      )
    );
  });
  AccordionTrigger.displayName = 'AccordionTrigger';

  var AccordionContent = fRef(function(props, ref) {
    var className = props.className, children = props.children, _isOpen = props._isOpen;
    if (!_isOpen) return null;
    return h('div', { ref: ref, className: cn('overflow-hidden text-sm transition-all', className) },
      h('div', { className: 'pb-4 pt-0' }, children)
    );
  });
  AccordionContent.displayName = 'AccordionContent';

  // ─── Register all on window.__UI ───
  window.__UI = {
    Card: Card, CardHeader: CardHeader, CardTitle: CardTitle, CardDescription: CardDescription,
    CardContent: CardContent, CardFooter: CardFooter, Separator: Separator,
    Button: Button, Input: Input, Label: Label, Textarea: Textarea,
    Select: Select, SelectTrigger: SelectTrigger, SelectContent: SelectContent, SelectItem: SelectItem, SelectValue: SelectValue,
    Checkbox: Checkbox, Switch: Switch, Slider: Slider,
    Badge: Badge, Alert: Alert, AlertTitle: AlertTitle, AlertDescription: AlertDescription,
    Progress: Progress, Skeleton: Skeleton,
    Dialog: Dialog, DialogTrigger: DialogTrigger, DialogContent: DialogContent,
    DialogHeader: DialogHeader, DialogTitle: DialogTitle, DialogDescription: DialogDescription, DialogFooter: DialogFooter,
    Sheet: Sheet, SheetTrigger: SheetTrigger, SheetContent: SheetContent,
    Table: Table, TableHeader: TableHeader, TableBody: TableBody, TableRow: TableRow, TableHead: TableHead, TableCell: TableCell,
    Tabs: Tabs, TabsList: TabsList, TabsTrigger: TabsTrigger, TabsContent: TabsContent,
    Avatar: Avatar, AvatarImage: AvatarImage, AvatarFallback: AvatarFallback,
    Tooltip: Tooltip, TooltipProvider: TooltipProvider, TooltipTrigger: TooltipTrigger, TooltipContent: TooltipContent,
    AspectRatio: AspectRatio, ScrollArea: ScrollArea,
    Accordion: Accordion, AccordionItem: AccordionItem, AccordionTrigger: AccordionTrigger, AccordionContent: AccordionContent,
  };
})();`

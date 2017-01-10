# angular-scrollable-style
Angular directive to transition element style properties on window scroll.

### Installation
```
bower install angular-scrollable-style --save
```

### Usage
#### Basic Usage
Add the `ng-scrollable-style` attribute to the element with its value set to a property definition object.
```
<div ng-scrollable-style="{'opacity': {'init':1, 'apply':0, 'delay':10, 'delta':25}}"></div>
```
* After scrolling 10 units, the opacity fades over 25 scroll units.

#### With Default Delay + Delta
Add the `ng-scrollable-style-delay` attribute to set default delay.
Add the `ng-scrollable-style-delta` attribute to set default delta.
```
<div ng-scrollable-style="{'opacity': {'init':1, 'apply':0}}" ng-scrollable-style-delay="10" ng-scrollable-style-delta="25"></div>
```
* This would have the same result as the previous example.

*Please see the example for more advanced configurations.*

#### Tip: Try using CSS transitions with delta=0


### Details
#### Attributes

* `ng-scrollable-style` - configure the style properties that change on scroll
* `ng-scrollable-style-enabled` - toggle the feature on or off
* `ng-scrollable-style-delay` - set default delay
* `ng-scrollable-style-delta` - set default delta
* `ng-scrollable-style-on-child` - set to true to apply style changes to first child (ex. in case of an element directive)

#### Property Configuration Object
Object keyed by style property name and configured with:

* `init` - starting value for the property
* `apply` - finishing value for the property
* `delay` *(optional)* - how long to wait before starting the transition
* `delta` *(optional)* - how long to complete the transition

#### Delay + Delta
Wherever they appear, `delay` and `delta` settings may be formatted as such:

* `(number)` - consecutive scroll ticks without changing direction
* `(number)%` - consecutive scroll ticks without changing direction as percentage of total scrollable
* `@(number)` - absolute scroll position
* `@(number)%` - absolute scroll position as percentage of total scrollable
* `{on:(value), off:(value)}` - different values for applying or resetting the style *(`(value)` can be any of the previous formats)*



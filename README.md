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
<div ng-scrollable-style="{'opacity': {'start':1, 'end':0, 'delay':10, 'delta':25}}"></div>
```
* After scrolling 10 units, the opacity fades over 25 scroll units.

#### With Default Delay + Delta
Add the `ng-scrollable-style-delay` attribute to set default delay.
Add the `ng-scrollable-style-delta` attribute to set default delta.
```
<div ng-scrollable-style="{'opacity': {'start':1, 'end':0}}" ng-scrollable-style-delay="10" ng-scrollable-style-delta="25"></div>
```
* This would have the same result as the previous example.

*Please see the example for more advanced configurations.*


### Details
#### Attributes

* `ng-scrollable-style` - configure the style properties that change on scroll
* `ng-scrollable-style-enabled` - toggle the feature on or off
* `ng-scrollable-style-delay` - set default delay (used on style properties that don't set their own)
* `ng-scrollable-style-delta` - set default delta (used on style properties that don't set their own)
* `ng-scrollable-style-on-child` - set if you need to transition the properties on the first child (ex. in case of an element directive)

#### Property Configuration Object
Object keyed by style property and configured with:

* `start` - starting value for the property
* `end` - finishing value for the property
* `delay` *(optional)* - how many scroll units to wait before starting the transition
* `delta` *(optional)* - how many scroll units to complete the transition

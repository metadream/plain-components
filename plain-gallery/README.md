# Plain Gallery
Lightweight and independent javascript image gallery component.

Before developing this component, I had been
using [photoswipe](https://github.com/dimsemenov/PhotoSwipe), which is a awesome image preview
lightbox, but it has a few uncomfortable little problems. First, sliding left and right cannot
transition smoothly; second, when the next original image is not loaded, it is displayed blank and
no thumbnail is used as a placeholder; third, because there are too many features to consider, the
component is too large and a bit complicated to use.

There will inevitably be bugs or performance issues in the project, and interested developers are
welcome to contribute to the improvements, thanks in advance.

## Demo
https://metadream.github.io/plain-gallery/plain-gallery.html

## Features
- Lightweight and independent (only about 10K after minified)
- Support smooth opening, closing and sliding
- Support click to zoom, scroll wheel to zoom
- Support natural transition between thumbnails and original images
- Support dragging within the visible boundaries
- Support simple event listening
- Support adaptive viewport
- Support custom toolbar
- Support gallery grouping
- ~Support swipe left and right, pinch to zoom on mobile~

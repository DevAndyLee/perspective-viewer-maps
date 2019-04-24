/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

const ol = window.ol;
const {fromLonLat} = ol.proj;

export function createTooltip(container, map) {
    let data = null;
    let config = null;
    let currentPoint = null;

    map.on("pointermove", evt => {
        if (!evt.dragging) {
            onMove(evt);
        } else {
            onLeave(evt);
        }
    });
    map.on("click", evt => onClick(evt));

    container.addEventListener("mouseleave", evt => onLeave(evt));

    const tooltipDiv = document.createElement("div");
    tooltipDiv.className = "map-tooltip";
    container.appendChild(tooltipDiv);

    const _tooltip = {};
    _tooltip.data = (...args) => {
        if (args.length) {
            data = args[0];
            return _tooltip;
        }
        return data;
    };
    _tooltip.config = (...args) => {
        if (args.length) {
            config = args[0];
            return _tooltip;
        }
        return config;
    };

    const onMove = evt => {
        // Find the closest point
        const {coordinate} = evt;
        const closest = data.reduce((best, point) => {
            const position = fromLonLat(point.cols);
            const distance = distanceBetween(coordinate, position);
            if (!best || distance < best.distance) {
                return {distance, point, position};
            }
            return best;
        }, null);
        if (!closest) return;

        const screen = map.getPixelFromCoordinate(closest.position);
        const mouse = map.getPixelFromCoordinate(coordinate);
        if (distanceBetween(screen, mouse) > 50) {
            return onLeave(evt);
        }

        if (currentPoint !== closest.point) {
            currentPoint = closest.point;

            tooltipDiv.innerHTML = composeHtml(currentPoint);
            tooltipDiv.style.left = `${screen[0]}px`;
            tooltipDiv.style.top = `${screen[1]}px`;
            tooltipDiv.className = "map-tooltip show";
        }
    };

    const onLeave = () => {
        tooltipDiv.className = "map-tooltip";
        currentPoint = null;
    };

    const onClick = () => {
        if (currentPoint) {
            const column_names = config.aggregate.map(a => a.column);
            const groupFilters = getFilter(getListFromJoin(currentPoint.group, config.row_pivot));
            const categoryFilters = getFilter(getListFromJoin(currentPoint.category, config.column_pivot));
            const filters = config.filter.concat(groupFilters).concat(categoryFilters);

            container.dispatchEvent(
                new CustomEvent("perspective-click", {
                    bubbles: true,
                    composed: true,
                    detail: {
                        column_names,
                        config: {filters},
                        row: currentPoint.row
                    }
                })
            );
        }
    };

    const composeHtml = point => {
        const group = point.group ? composeGroup(point.group) : "";
        const category = composeCategory(point.category);
        const location = composeLocation(point.cols);

        return `${group}${category}${location}`;
    };

    const composeGroup = group => {
        const groupList = getListFromJoin(group, config.row_pivot);
        if (groupList.length === 1) {
            return `<h1 class="title">${group}</h1>`;
        }
        return composeList(groupList);
    };

    const composeCategory = category => {
        return composeList(getListFromJoin(category, config.column_pivot));
    };

    const getListFromJoin = (join, pivot) => {
        if (pivot.length) {
            const values = join.split("|");
            return values.map((value, i) => ({name: pivot[i], value}));
        }
        return [];
    };

    const getFilter = list => {
        return list.map(item => ([item.name, "==", item.value]));
    };

    const composeList = items => {
        if (items.length) {
            const itemList = items.map(item => `<li><span class="label">${sanitize(item.name)}</span></span>${sanitize(item.value)}</span></li>`);
            return `<ul>${itemList.join("")}</ul>`;
        }
        return "";
    };

    const composeLocation = cols => {
        return `<span class="location">(${cols[0]}, ${cols[1]})</span>`;
    };

    const sanitize = text => {
        tooltipDiv.innerText = text;
        return tooltipDiv.innerHTML;
    };

    const distanceBetween = (c1, c2) => {
        return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2));
    };

    return _tooltip;
}
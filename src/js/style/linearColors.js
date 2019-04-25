/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */
import {interpolate} from "d3-interpolate";
import {scaleSequential} from "d3-scale";

import {computedStyle, asRgb} from "./computed";
import * as gparser from "gradient-parser";

const GRADIENT_COLOR_VAR = "--map-gradient";
const GRADIENT_DEFAULT = "linear-gradient(#4d342f 0%, #e4521b 22.5%, #decb45 42.5%, #a0a0a0 50%, #bccda8 57.5%, #42b3d5 67.5%, #1a237e 100%)";

const defaultValueFn = d => d.cols[2];
export const linearColorMap = (container, extent, valueFn = defaultValueFn) => {
    const gradient = getGradient(container);

    const interpolator = multiInterpolator(gradient);

    const domain = [Math.min(extent.min, -extent.max), Math.max(-extent.min, extent.max)];
    const scale = scaleSequential(interpolator).domain(domain);

    return point => scale(valueFn(point));
};

const getGradient = container => {
    const computed = computedStyle(container);
    const gradient = computed(GRADIENT_COLOR_VAR, GRADIENT_DEFAULT);

    return gparser
        .parse(gradient)[0]
        .colorStops.map(g => [g.length.value / 100, asRgb(`#${g.value}`)])
        .sort((a, b) => a[0] - b[0]);
};

const multiInterpolator = gradientPairs => {
    // A new interpolator that calls through to a set of
    // interpolators between each value/color pair
    const interpolators = gradientPairs.slice(1).map((p, i) => interpolate(gradientPairs[i][1], p[1]));
    return value => {
        const index = gradientPairs.findIndex((p, i) => i < gradientPairs.length - 1 && value <= gradientPairs[i + 1][0] && value > p[0]);
        if (index === -1) {
            if (value <= gradientPairs[0][0]) {
                return gradientPairs[0][1];
            }
            return gradientPairs[gradientPairs.length - 1][1];
        }

        const interpolator = interpolators[index];
        const [value1] = gradientPairs[index];
        const [value2] = gradientPairs[index + 1];

        return interpolator((value - value1) / (value2 - value1));
    };
};

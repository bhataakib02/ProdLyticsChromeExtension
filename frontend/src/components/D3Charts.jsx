"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

const COLOR_PRIMARY = "#6366f1";
const COLOR_SECONDARY = "#ec4899";

function normalizeHistory(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((d) => {
            const t = d?.time != null ? new Date(d.time) : null;
            const load = Number(d?.loadScore);
            return {
                time: t,
                loadScore: Number.isFinite(load) ? Math.min(10, Math.max(0.5, load)) : 1,
            };
        })
        .filter((d) => d.time && !Number.isNaN(d.time.getTime()));
}

export default function BurnoutRiskChart({ data }) {
    const wrapRef = useRef(null);
    const svgRef = useRef(null);
    const [size, setSize] = useState({ width: 640, height: 320 });

    const cleaned = useMemo(() => normalizeHistory(data), [data]);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const update = () => {
            const r = el.getBoundingClientRect();
            setSize({
                width: Math.max(200, Math.floor(r.width)),
                height: Math.max(220, Math.floor(r.height)),
            });
        };
        const ro = new ResizeObserver(() => update());
        ro.observe(el);
        update();
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;
        const svgRoot = d3.select(svgRef.current);
        svgRoot.selectAll("*").remove();

        if (cleaned.length === 0) return;

        const hour12 = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12;

        // Extra space so axis tick labels never get clipped when container height changes.
        const margin = { top: 26, right: 20, bottom: 56, left: 58 };
        const innerW = Math.max(160, size.width - margin.left - margin.right);
        const height = Math.max(120, size.height - margin.top - margin.bottom);

        const svg = svgRoot
            .attr("viewBox", `0 0 ${innerW + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("role", "img")
            .attr("aria-label", "Cognitive load over time")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const t0 = d3.min(cleaned, (d) => d.time);
        const t1 = d3.max(cleaned, (d) => d.time);
        const padMs = 60 * 60 * 1000;
        const xDomain =
            t0.getTime() === t1.getTime()
                ? [new Date(t0.getTime() - padMs), new Date(t1.getTime() + padMs)]
                : [t0, t1];

        const x = d3.scaleTime().domain(xDomain).range([0, innerW]);

        const yMinRaw = d3.min(cleaned, (d) => d.loadScore);
        const yMaxRaw = d3.max(cleaned, (d) => d.loadScore);
        let yLow = Math.max(0, yMinRaw - 0.75);
        let yHigh = Math.min(10, yMaxRaw + 0.75);
        if (yHigh - yLow < 0.5) {
            const mid = (yMinRaw + yMaxRaw) / 2;
            yLow = Math.max(0, mid - 1);
            yHigh = Math.min(10, mid + 1);
        }

        const y = d3.scaleLinear().domain([yLow, yHigh]).range([height, 0]);

        const defs = svg.append("defs");
        const filter = defs
            .append("filter")
            .attr("id", "burnout-glow")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
        filter.append("feGaussianBlur").attr("stdDeviation", "3.5").attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        const lineGradient = defs
            .append("linearGradient")
            .attr("id", "burnout-line-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");
        lineGradient.append("stop").attr("offset", "0%").attr("stop-color", COLOR_PRIMARY);
        lineGradient.append("stop").attr("offset", "100%").attr("stop-color", COLOR_SECONDARY);

        const xAxisTimeFmt = hour12 ? d3.timeFormat("%I:%M %p") : d3.timeFormat("%H:%M");

        const xAxis = d3
            .axisBottom(x)
            .ticks(6)
            .tickFormat(xAxisTimeFmt)
            .tickPadding(10)
            .tickSizeOuter(0)
            .tickSizeInner(0);
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .attr("color", "rgba(255,255,255,0.1)")
            .selectAll("text")
            .style("fill", "#9ca3af")
            .style("font-family", "system-ui, sans-serif")
            .style("font-size", "10px")
            .style("font-weight", "500");

        // Consistent 0.5-step ticks for a clean cognitive-load scale.
        const yStart = Math.ceil(yLow * 2) / 2;
        const yEnd = Math.floor(yHigh * 2) / 2;
        const yTicks = d3.range(yStart, yEnd + 0.001, 0.5);
        const yAxis = d3.axisLeft(y).tickValues(yTicks).tickFormat((d) => Number(d).toFixed(1));
        svg.append("g")
            .call(yAxis)
            .attr("color", "rgba(255,255,255,0.1)")
            .selectAll("text")
            .style("fill", "#9ca3af")
            .style("font-family", "system-ui, sans-serif")
            .style("font-size", "10px")
            .style("font-weight", "500");

        svg.selectAll(".domain").remove();

        const line = d3
            .line()
            .x((d) => x(d.time))
            .y((d) => y(d.loadScore))
            .curve(d3.curveMonotoneX);

        const area = d3
            .area()
            .x((d) => x(d.time))
            .y0(height)
            .y1((d) => y(d.loadScore))
            .curve(d3.curveMonotoneX);

        const areaGradient = defs
            .append("linearGradient")
            .attr("id", "burnout-area-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");
        areaGradient
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", COLOR_PRIMARY)
            .attr("stop-opacity", 0.22);
        areaGradient
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", COLOR_SECONDARY)
            .attr("stop-opacity", 0);

        svg.append("path").datum(cleaned).attr("fill", "url(#burnout-area-gradient)").attr("d", area);

        const path = svg
            .append("path")
            .datum(cleaned)
            .attr("fill", "none")
            .attr("stroke", "url(#burnout-line-gradient)")
            .attr("stroke-width", 3.5)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("filter", "url(#burnout-glow)")
            .attr("d", line);

        const pulse = svg
            .append("path")
            .datum(cleaned)
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("filter", "url(#burnout-glow)")
            .attr("opacity", 0.55)
            .attr("d", line);

        const timeFmt = hour12 ? d3.timeFormat("%I:%M %p") : d3.timeFormat("%H:%M");
        svg.selectAll(".dot")
            .data(cleaned)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", (d) => x(d.time))
            .attr("cy", (d) => y(d.loadScore))
            .attr("r", 5)
            .attr("fill", "#030712")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2.5)
            .style("cursor", "pointer")
            .each(function (d) {
                d3.select(this)
                    .append("title")
                    .text(
                        `${timeFmt(d.time)} · Cognitive load ${d.loadScore.toFixed(1)}/10 (from scroll, clicks, time on site)`
                    );
            })
            .on("mouseover", function () {
                d3.select(this).transition().duration(200).attr("r", 8);
            })
            .on("mouseout", function () {
                d3.select(this).transition().duration(200).attr("r", 5);
            });

        const node = path.node();
        if (node?.getTotalLength) {
            const totalLength = node.getTotalLength();
            path.attr("stroke-dasharray", `${totalLength} ${totalLength}`)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(2000)
                .ease(d3.easeExpInOut)
                .attr("stroke-dashoffset", 0);

            function repeatPulse() {
                pulse
                    .attr("stroke-dasharray", `40, ${totalLength}`)
                    .attr("stroke-dashoffset", totalLength)
                    .transition()
                    .duration(2500)
                    .ease(d3.easeLinear)
                    .attr("stroke-dashoffset", 0)
                    .on("end", repeatPulse);
            }
            repeatPulse();
        }
    }, [cleaned, size]);

    if (cleaned.length === 0) {
        return (
            <div
                ref={wrapRef}
                className="w-full h-full min-h-[280px] flex flex-col items-center justify-center text-center px-6"
            >
                <p className="mb-2 text-sm font-bold text-foreground/85">Chart needs more browsing data</p>
                <p className="text-xs text-muted max-w-md leading-relaxed">
                    Install the extension and use the web normally for a few hours. This graph then shows estimated mental
                    effort by hour (from scrolls, clicks, and time on pages)—real usage, not a placeholder curve.
                </p>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="h-full w-full min-h-[240px]">
            <svg ref={svgRef} className="block h-full w-full" preserveAspectRatio="none" />
        </div>
    );
}

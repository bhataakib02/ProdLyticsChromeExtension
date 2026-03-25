"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function BurnoutRiskChart({ data }) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0 || !svgRef.current) return;

        // Clear previous chart on re-render
        d3.select(svgRef.current).selectAll("*").remove();

        const margin = { top: 30, right: 30, bottom: 40, left: 40 };
        const width = 600 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => new Date(d.time)))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, 10])
            .range([height, 0]);

        // Glow Filter
        const defs = svg.append("defs");
        const filter = defs.append("filter")
            .attr("id", "glow")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
        filter.append("feGaussianBlur")
            .attr("stdDeviation", "3.5")
            .attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // Axes styling
        const xAxis = d3.axisBottom(x)
            .ticks(5)
            .tickFormat(d3.timeFormat("%H:%M"));

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .attr("color", "rgba(255,255,255,0.1)")
            .selectAll("text")
            .style("fill", "#9ca3af")
            .style("font-family", "sans-serif")
            .style("font-size", "10px")
            .style("font-weight", "500");

        const yAxis = d3.axisLeft(y).ticks(5);
        svg.append("g")
            .call(yAxis)
            .attr("color", "rgba(255,255,255,0.1)")
            .selectAll("text")
            .style("fill", "#9ca3af")
            .style("font-family", "sans-serif")
            .style("font-size", "10px")
            .style("font-weight", "500");

        // Remove axis lines but keep ticks
        svg.selectAll(".domain").remove();

        // Line generator (Heartbeat / ECG style)
        const line = d3.line()
            .x(d => x(new Date(d.time)))
            .y(d => y(d.loadScore))
            .curve(d3.curveLinear);

        // Gradient for line
        const lineGradient = defs.append("linearGradient")
            .attr("id", "line-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");
        lineGradient.append("stop").attr("offset", "0%").attr("stop-color", "var(--color-primary)");
        lineGradient.append("stop").attr("offset", "100%").attr("stop-color", "var(--color-secondary)");

        // Add the line path
        const path = svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "url(#line-gradient)")
            .attr("stroke-width", 3.5)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("filter", "url(#glow)")
            .attr("d", line);

        // Heartbeat "Pulse" Light
        const pulse = svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("filter", "url(#glow)")
            .attr("opacity", 0.6)
            .attr("d", line);

        // Area Gradient
        const area = d3.area()
            .x(d => x(new Date(d.time)))
            .y0(height)
            .y1(d => y(d.loadScore))
            .curve(d3.curveLinear);

        const areaGradient = defs.append("linearGradient")
            .attr("id", "area-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");
        areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "var(--color-primary)").attr("stop-opacity", 0.2);
        areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "var(--color-secondary)").attr("stop-opacity", 0);

        svg.append("path")
            .datum(data)
            .attr("fill", "url(#area-gradient)")
            .attr("d", area);

        // Interactive Dots
        svg.selectAll(".dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(new Date(d.time)))
            .attr("cy", d => y(d.loadScore))
            .attr("r", 5)
            .attr("fill", "#000")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2.5)
            .style("cursor", "pointer")
            .on("mouseover", function () {
                d3.select(this).transition().duration(200).attr("r", 8);
            })
            .on("mouseout", function () {
                d3.select(this).transition().duration(200).attr("r", 5);
            });

        // Animation
        const totalLength = path.node().getTotalLength();
        path
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000)
            .ease(d3.easeExpInOut)
            .attr("stroke-dashoffset", 0);

        // Repeatable Pulse Loop
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

    }, [data]);

    return (
        <div className="w-full h-full flex justify-center items-center">
            <svg ref={svgRef} className="w-full h-auto max-w-full" preserveAspectRatio="xMidYMid meet"></svg>
        </div>
    );
}

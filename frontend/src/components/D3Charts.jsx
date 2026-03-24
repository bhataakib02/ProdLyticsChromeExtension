"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function BurnoutRiskChart({ data }) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0 || !svgRef.current) return;

        // Clear previous chart on re-render
        d3.select(svgRef.current).selectAll("*").remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        const width = 600 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => new Date(d.time)))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, 10]) // Cognitive load scale from 0 to 10
            .range([height, 0]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5))
            .attr("color", "#9ca3af");

        svg.append("g")
            .call(d3.axisLeft(y).ticks(5))
            .attr("color", "#9ca3af");

        // Add X axis label
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", width / 2 + margin.left)
            .attr("y", height + margin.top + 15)
            .attr("fill", "#6b7280")
            .text("Time");

        // Add Y axis label
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -margin.top - height / 2 + 20)
            .attr("fill", "#6b7280")
            .text("Cognitive Load");

        // Line generator
        const line = d3.line()
            .x(d => x(new Date(d.time)))
            .y(d => y(d.loadScore))
            .curve(d3.curveMonotoneX);

        // Add the line path
        const path = svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#ff3366") // Primary accent color
            .attr("stroke-width", 3)
            .attr("d", line);

        // Add Area Gradient
        const area = d3.area()
            .x(d => x(new Date(d.time)))
            .y0(height)
            .y1(d => y(d.loadScore))
            .curve(d3.curveMonotoneX);

        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "area-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", "#ff3366").attr("stop-opacity", 0.4);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", "#ff3366").attr("stop-opacity", 0.0);

        svg.append("path")
            .datum(data)
            .attr("fill", "url(#area-gradient)")
            .attr("d", area);

        // Draw Circles
        svg.selectAll("myCircles")
            .data(data)
            .enter()
            .append("circle")
            .attr("fill", "#fff")
            .attr("stroke", "#ff3366")
            .attr("stroke-width", 2)
            .attr("cx", d => x(new Date(d.time)))
            .attr("cy", d => y(d.loadScore))
            .attr("r", 4);

        // Animation
        const totalLength = path.node().getTotalLength();

        path
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

    }, [data]);

    return (
        <div className="w-full h-full flex justify-center items-center py-4">
            <svg ref={svgRef} className="w-full h-auto max-w-full" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet"></svg>
        </div>
    );
}

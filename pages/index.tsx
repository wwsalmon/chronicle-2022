import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import data from "../utils/countries-110m.json";
import { feature } from "topojson-client";

export default function Index() {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const didMount = useRef<boolean>(false);

    useEffect(() => {
        if (!svgRef.current || !window || didMount.current) return;

        didMount.current = true;

        const height = window.innerHeight;
        const width = window.innerWidth;
        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewbox", `0 0 ${width} ${height}`)
            .style("position", "fixed");

        const scaleZoom = 0.8;

        const xOffset = width / 2;
        const yOffset = 0.3 * height + scaleZoom * width;

        const bg = svg.append("rect").attr("width", width).attr("height", height).attr("fill", "black");

        const sensitivity = 50;

        const projection = d3.geoOrthographic()
            .scale(scaleZoom * width)
            .center([0, 0])
            .rotate([98,10,0])
            .translate([xOffset, yOffset]);

        const initialScale = projection.scale();

        svg.append("circle")
            .attr("fill", "#EEE")
            .attr("stroke", "#000")
            .attr("stroke-width", "0.2")
            .attr("cx", xOffset)
            .attr("cy", yOffset)
            .attr("r", initialScale)
            .style("fill", "url(#ocean_fill)");

        let path = d3.geoPath().projection(projection);

        // const graticule = d3.geoGraticule();
        //
        // svg.append("path")
        //     .datum(graticule())
        //     .attr("class", "graticule")
        //     .attr("d", path)
        //     .attr("fill", "none")
        //     .attr("stroke", "#cccccc")
        //     .attr("stroke-width", "0.5px");

        // e might be wrong here (event)
        svg
            .call(d3.drag<SVGSVGElement>().on("drag", e => {
                const rotate = projection.rotate();
                const k = sensitivity / projection.scale();

                projection.rotate([
                    rotate[0] + e.dx * k,
                    rotate[1] - e.dy * k,
                    rotate[2],
                ]);

                path = d3.geoPath().projection(projection);

                svg.selectAll("path").attr("d", path);
            }))
            // .call(d3.zoom<SVGSVGElement>().on("zoom", e => {
            //     if (e.transform.k > 0.3) {
            //         projection.scale(initialScale * e.transform.k)
            //         path = d3.geoPath().projection(projection)
            //         svg.selectAll("path").attr("d", path)
            //         globe.attr("r", projection.scale());
            //     } else {
            //         e.transform.k = 0.3;
            //     }
            // }));

        let map = svg.append("g");

        console.log(d3.geoPath(projection)(feature(data, data.objects.land).features[0]));

        map.append("g")
            .attr("class", "land" )
            .append("path")
            .datum(feature(data, data.objects.land))
            .attr("d", d => d3.geoPath(projection)(d))
            .attr("fill", "rgb(117, 87, 57)");

        svg
            .append("g")
            .attr("class", "countries")
            .selectAll("path")
            .data(feature(data, data.objects.countries).features)
            .enter()
            .append("path")
            .attr("d", d => d3.geoPath(projection)(d))
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("fill", "transparent");

        // drop shadows
        svg.append("circle")
            .attr("cx", xOffset)
            .attr("cy", yOffset)
            .attr("r", projection.scale())
            .attr("class", "noclicks")
            .style("fill", "url(#globe_highlight)");

        svg
            .append("circle")
            .attr("cx", xOffset)
            .attr("cy", yOffset)
            .attr("r", projection.scale())
            .attr("class", "noclicks")
            .style("fill", "url(#globe_shading)");

        d3.timer(function(elapsed) {
            const rotate = projection.rotate()
            projection.rotate([
                rotate[0] + 0.04 * Math.sin(elapsed / 2000),
                rotate[1] + 0.01 * Math.sin(elapsed / 1500),
                rotate[2],
            ]);
            path = d3.geoPath().projection(projection)
            svg.selectAll("path").attr("d", path)
        },200);
    }, [svgRef.current]);

    return (
        <>
            <svg ref={svgRef}>
                <defs>
                    {/*from http://bl.ocks.org/lunarmoon26/09d4d0ef25fd32ed663db969f5bc79fe*/}
                    <radialGradient cx="75%" cy="25%" id="ocean_fill">
                        <stop offset="5%" stop-color="#ddf" />
                        <stop offset="100%" stop-color="#9ab" />
                    </radialGradient>
                    <radialGradient cx="75%" cy="25%" id="globe_highlight">
                        <stop offset="5%" stop-color="#ffd" stop-opacity="0.6" />
                        <stop offset="100%" stop-color="#ba9" stop-opacity="0.2" />
                    </radialGradient>
                    <radialGradient cx="50%" cy="40%" id="globe_shading">
                        <stop offset="50%" stop-color="#9ab" stop-opacity="0" />
                        <stop offset="100%" stop-color="#3e6184" stop-opacity="0.3" />
                    </radialGradient>
                    <radialGradient cx="50%" cy="50%" id="drop_shadow">
                        <stop offset="20%" stop-color="#000" stop-opacity="0.5" />
                        <stop offset="100%" stop-color="#000" stop-opacity="0" />
                    </radialGradient>
                </defs>
            </svg>
        </>
    );
}

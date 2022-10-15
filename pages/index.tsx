import { useEffect, useRef } from "react";
import * as d3 from "d3";
import data from "../utils/countries-110m.json";
import { feature } from "topojson-client";

const locations = [
    {label: "New York, NY", y: 40.7128, x: -74.0060, type: "lived", time: 14},
    {label: "Boston, MA", y: 42.3601, x: -71.0589, type: "lived", time: 3},
    {label: "Los Angeles, CA", y: 34.0522, x: -118.2437, type: "current", time: 2},
    {label: "San Francisco, CA", y: 37.7749, x: -122.4194, type: "want", time: 1},
    {label: "Farmington, UT", y: 40.9805, x: -111.8874, type: "lived", time: 1},
];

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

        const bg = svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "#010D12");

        const sensitivity = 50;

        const projection = d3.geoOrthographic()
            .scale(scaleZoom * width)
            .center([0, 0])
            .rotate([98,10,0])
            .translate([xOffset, yOffset]);

        const initialScale = projection.scale();

        svg.append("circle")
            .attr("fill", "#010D12")
            .attr("stroke", "#fff")
            .attr("stroke-width", "0.2")
            .attr("cx", xOffset)
            .attr("cy", yOffset)
            .attr("r", initialScale)
            // .style("fill", "url(#ocean_fill)");

        let path = d3.geoPath().projection(projection);

        // drag behavior
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
            }));

        // countries
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
            .attr("fill", "#243E54");

        // graticules
        const graticule = d3.geoGraticule();

        svg.append("path")
            .datum(graticule())
            .attr("class", "graticule")
            .attr("d", path)
            .attr("fill", "none")
            .attr("stroke", "#cccccc")
            .attr("stroke-width", "0.1px");

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

        function drawMarkers() {
            svg.selectAll("circle.marker").data(locations)
                .join("circle")
                .attr("class", "marker")
                .attr("cx", d => projection([d.x, d.y])[0])
                .attr("cy", d => projection([d.x, d.y])[1])
                .attr("fill", d => {
                    const coordinate: [number, number] = [d.x, d.y];
                    const gdistance = d3.geoDistance(coordinate, projection.invert([xOffset, yOffset]));
                    if (gdistance > 1.57) return "none";
                    return d.type === "current" ? "orange" : "white";
                })
                .attr("stroke", d => {
                    const coordinate: [number, number] = [d.x, d.y];
                    const gdistance = d3.geoDistance(coordinate, projection.invert([xOffset, yOffset]));
                    if (gdistance > 1.57) return "none";
                    return d.type === "want" ? "orange" : "none"
                })
                .attr("stroke-width", d => d.type === "want" ? 8 : 0.5)
                .style("opacity", 0.6)
                .attr("r", d => ((Math.log(d.time) + 1) * 12) + (+(d.type === "want") * 8));

            svg.selectAll("text.markerText").data(locations)
                .join("text")
                .attr("class", "markerText")
                .text(d => d.label)
                .attr("x", d => projection([d.x, d.y])[0] + ((Math.log(d.time) + 1) * 12) + (+(d.type === "want") * 8) + 8)
                .attr("y", d => projection([d.x, d.y])[1])
                .attr("fill", "white")
                .style("opacity", 0.5)
                .attr("dominant-baseline", "middle");
        }

        d3.timer(function(elapsed) {
            const rotate = projection.rotate()
            projection.rotate([
                rotate[0] + 0.04 * Math.sin(elapsed / 2000),
                rotate[1] + 0.01 * Math.sin(elapsed / 1500),
                rotate[2],
            ]);
            drawMarkers();
            path = d3.geoPath().projection(projection)
            svg.selectAll("path").attr("d", path)
        },200);
    }, [svgRef.current]);

    return (
        <>
            <svg ref={svgRef}>
                <defs>
                    {/*from http://bl.ocks.org/lunarmoon26/09d4d0ef25fd32ed663db969f5bc79fe*/}
                    <radialGradient cx="75%" cy="25%" id="globe_highlight">
                        <stop offset="5%" stop-color="#ffd" stop-opacity="0.3" />
                        <stop offset="100%" stop-color="#ba9" stop-opacity="0.1" />
                    </radialGradient>
                    <radialGradient cx="50%" cy="40%" id="globe_shading">
                        <stop offset="50%" stop-color="#9ab" stop-opacity="0" />
                        <stop offset="100%" stop-color="#3e6184" stop-opacity="0.15" />
                    </radialGradient>
                    <radialGradient cx="50%" cy="50%" id="drop_shadow">
                        <stop offset="20%" stop-color="#000" stop-opacity="0.25" />
                        <stop offset="100%" stop-color="#000" stop-opacity="0" />
                    </radialGradient>
                </defs>
            </svg>
        </>
    );
}

import { ReactNode, useEffect, useRef } from "react";
import * as d3 from "d3";
import data from "../utils/countries-110m.json";
import { feature } from "topojson-client";
import { FiArrowDown } from "react-icons/fi";
import classNames from "classnames";

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
            .style("fill", "url(#globe_highlight)");

        svg
            .append("circle")
            .attr("cx", xOffset)
            .attr("cy", yOffset)
            .attr("r", projection.scale())
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

    const TOD = (() => {
        const currHour = new Date().getHours();
        if (currHour < 12) return "morning";
        if (currHour < 18) return "afternoon";
        return "evening";
    })();

    return (
        <>
            <svg ref={svgRef} className="fixed top-0 left-0 right-0 bottom-0">
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
            <div className="z-5 relative">
                <Section className="text-white border-box relative">
                    <h1 className="text-3xl sm:text-5xl leading-tight sm:leading-tight font-headline mb-8">Good {TOD}, <i>Chronicle</i>.<br/>Welcome to my journalism and software portfolio!</h1>
                    <div className="flex items-center">
                        <img src="/profile.jpg" className="rounded-full w-16 h-16" alt="Profile picture of Samson Zhang" />
                        <a className="text-xl leading-tight pl-4 block" href="https://twitter.com/wwsalmon">
                            <p className="font-bold text-bblue">Samson Zhang</p>
                            <p className="text-[#757575]">@wwsalmon</p>
                        </a>
                    </div>
                    <div className="sm:absolute bottom-12 right-12 mt-12 bg-black bg-opacity-50 p-4 rounded-md">
                        <p className="font-bold mb-4 uppercase">Notable places in my life</p>
                        {[
                            {label: "where I've lived", circle: <div className="rounded-full w-4 h-4 bg-white opacity-60"/>},
                            {label: "where I live now", circle: <div className="rounded-full w-4 h-4 bg-amber-500 opacity-60"/>},
                            {label: "where I want to be this summer", circle: <div className="rounded-full w-4 h-4 border-4 border-amber-500 opacity-60"/>},
                        ].map(d => (
                            <div className="flex items-center" key={d.label}>
                                {d.circle}
                                <p className="ml-4 opacity-75">{d.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="absolute bottom-8 sm:bottom-16 left-8 sm:left-16">
                        <p className="font-bold mb-4 uppercase">Scroll down!</p>
                        <div className="rounded-full w-8 h-8 bg-bblue bg-opacity-75 shadow-lg animate-bounce flex items-center justify-center">
                            <FiArrowDown/>
                        </div>
                    </div>
                </Section>
                <Section className="bg-white">
                    <ThreeColContainer>
                        <ThreeColChild>
                            <H1>First and foremost, I'm a journalist.</H1>
                            {/*<p className="font-body text-xl">Hello world</p>*/}
                        </ThreeColChild>
                        <ThreeColChild>
                            <Post
                                title="Preventing ‘double punishment’: Inside the campaign to end California’s prison-to-deportation pipeline"
                                href="https://theyappie.com/california-deportations-southeast-asian/"
                                img="/sjn.png"
                                description="A solutions piece on a decade of organizing against the deportation of formerly incarcerated Southeast Asian refugees in California."
                                publication="The Yappie"
                            />
                            <Bullet>Funded by a Solutions Journalism Network Advancing Democracy grant</Bullet>
                            <Bullet>Cited by AAAJ-Asian Law Caucus and other advocacy orgs</Bullet>
                            <Post
                                className="mt-20"
                                title="Invasion of Ukraine weighs heavily on 5C community members with connections to the conflict"
                                href="https://tsl.news/ukraine-russia-war-5c-student-impact/"
                                img="/ukraine.jpg"
                                description="When Maria Lyven PO '22 asked her family how they were doing last week, her mother told her that she woke up to the sound of explosions."
                                publication="The Student Life"
                                small={true}
                            />
                        </ThreeColChild>
                        <ThreeColChild>
                            <Post
                                title="Journalism’s influential awards lack diverse judges"
                                href="https://objectivejournalism.org/2022/08/journalism-awards-lack-diverse-judges/"
                                img="/aaja.png"
                                description="A groundbreaking investigative finding that people of color are often still the only person of their race in the (judging) room."
                                publication="AAJA Voices"
                            />
                            <Bullet>Presented at AAJA's 2022 National Convention</Bullet>
                            <Bullet>Led to advocacy for change by LA Times Exec. Editor Kevin Merida, NAHJ President Yvette Cabrera and other news leaders</Bullet>
                            <Post
                                className="mt-20"
                                small={true}
                                title="Voters oust San Francisco school board members in historic race that galvanized AAPIs"
                                href="https://theyappie.com/san-francisco-recall-asian-american-pacific-islander/"
                                img="/lowell.jpg"
                                description="The city’s first Pacific Islander elected leader was one of three officials recalled in Tuesday’s high-stakes special election, which featured a surge in AAPI activism."
                                publication="The Yappie"
                            />
                        </ThreeColChild>
                    </ThreeColContainer>
                </Section>
                <Section className="bg-bblue text-white">
                    <ThreeColContainer>
                        <ThreeColChild>
                            <H1>But I love using data and web tools to tell important and engaging stories.</H1>
                            {/*<p className="font-body text-xl">Hello world</p>*/}
                        </ThreeColChild>
                        <ThreeColChild>
                            <Post
                                title="Data visualization: first-generation, Black student percentages drop in Pomona’s class of 2025"
                                href="https://tsl.news/pomona-class-of-2025-diversity/"
                                img="/co2025.gif"
                                description="Pomona's most selective class to date is also its least diverse in several years."
                                publication="The Student Life"
                                dark={true}
                            />
                            <Bullet dark={true}>
                                Awarded Best Interactive Graphic of 2021 by the California College Media Association
                            </Bullet>
                            <Post
                                className="mt-20"
                                title="The Cost of Increasing Costs: Accounting for tuition increases at the 5Cs"
                                href="https://tsl-tuition-datavis-2022.vercel.app"
                                img="/tuition.gif"
                                description="Investigative data piece visualizing eight years of school financial reports to explain why tuition consistently increases more than inflation."
                                publication="The Student Life"
                                dark={true}
                            />
                        </ThreeColChild>
                        <ThreeColChild>
                            <Post
                                title="5C COVID Tracker"
                                href="https://tsl-covid.samsonzhang.com"
                                img="/covid.gif"
                                description="Interactive dashboard that faculty relied on for decision-making in lieu of consistent administration reporting, and that exposed official counting errors."
                                publication="The Student Life"
                                dark={true}
                            />
                            <Bullet dark={true}>
                                Part of a package awarded Best COVID Coverage of 2021 by the California College Media Association
                            </Bullet>
                            <Post
                                title="Data visualization: Pomona, Harvey Mudd admit 2026 classes with record diversity"
                                href="https://tsl.news/pomona-hmc-co2026-diversity/"
                                className="mt-20"
                                img="/co2026.gif"
                                description="With 61.4% domestic students of color accepted at Pomona and 70% at Harvey Mudd, the pools of admitted first years are on track to form the most diverse class profiles in both colleges’ histories."
                                publication="The Student Life"
                                dark={true}
                            />
                        </ThreeColChild>
                    </ThreeColContainer>
                </Section>
                <Section className="bg-[#222] bg-opacity-60 text-white">
                    <ThreeColContainer>
                        <ThreeColChild>
                            <H1>Before journalism, building software was my jam.</H1>
                            {/*<p className="font-body text-xl">Hello world</p>*/}
                        </ThreeColChild>
                        <ThreeColChild>
                            <Website href="https://postulate.us" img="/postulate.png"/>
                            <Website href="https://contrary.com" img="/contrary.jpg" className="mt-20"/>
                        </ThreeColChild>
                        <ThreeColChild>
                            <Website href="https://gostoryboard.org" img="/storyboard.jpg" className="mt-20"/>
                            <Website href="https://questionjournal.szh.land" img="/qj.png" className="mt-20"/>
                            <Website href="https://threader.szh.land" img="/threader.png" className="mt-20"/>
                        </ThreeColChild>
                    </ThreeColContainer>
                </Section>
                <Section className="bg-[#666] bg-opacity-60 text-white">
                    <ThreeColContainer>
                        <ThreeColChild>
                            <H1>Now I want journalism to be my future.</H1>
                            <p className="font-body text-xl">I would love to continue my journey at the Chronicle. Thanks for your consideration ♥</p>
                        </ThreeColChild>
                        <ThreeColChild>
                            <img src="/voices.jpg" className="mb-16"/>
                            <img src="/vtn.jpg" className="mb-16"/>
                            <img src="/irena.png"/>
                        </ThreeColChild>
                        <ThreeColChild>
                            <p className="font-bold mb-4 uppercase">References you can ask about me</p>
                            <Bullet dark={true}>Jasper Davidoff (jlda2018@mymail.pomona.edu), my Editor-in-chief at The Student Life</Bullet>
                            <Bullet dark={true}>Rahul Mukherjee (r.mukherjee5@icloud.com), Hearst Interactives Editor and my editor at AAJA Voices</Bullet>
                            <Bullet dark={true}>Andrew Peng (andrew.peng@theyappie.com), President of The Yappie</Bullet>
                        </ThreeColChild>
                    </ThreeColContainer>
                </Section>
            </div>
        </>
    );
}

const Section = ({children, className}: {children: ReactNode, className?: string}) => (
    <div className={classNames("p-8 md:p-16 min-h-screen", className)}>
        {children}
    </div>
)

const ThreeColContainer = ({children, className}: {children: ReactNode, className?: string}) => (
    <div className={classNames("md:flex max-w-6xl mx-auto", className)}>
        {children}
    </div>
)

const ThreeColChild = ({children, className}: {children: ReactNode, className?: string}) => (
    <div className={classNames("md:w-1/3 md:px-8 mb-20 md:mb-0", className)}>
        {children}
    </div>
)

const Post = ({title, href, img, description, publication, className, small, dark}: {title: string, href: string, img: string, description: string, publication: string, className?: string, small?: boolean, dark?: boolean}) => (
    <a href={href} className={classNames("block", className)}>
        {!small && (
            <img src={img} />
        )}
        <p className={classNames("font-bold uppercase my-4", dark ? "opacity-75" : "text-bblue")}>{publication}</p>
        <div className="flex my-4">
            <h2 className={classNames("font-headline font-medium", small ? "text-lg" : "text-2xl")}>{title}</h2>
            {small && (
                <div className="w-24 flex-shrink-0">
                    <img src={img} className="w-24 h-24 object-cover ml-4"/>
                </div>
            )}
        </div>
        <p className={dark ? "opacity-50" : "text-bgray"}>{description}</p>
    </a>
)

const Bullet = ({className, children, dark}: {className?: string, children: ReactNode, dark?: boolean}) => (
    <div className={classNames("flex my-3", className, dark && "opacity-75")}>
        <div className={classNames("w-[6px] h-[5px] mt-2 mr-3 flex-shrink-0", dark ? "bg-white" : "bg-bblue")}/>
        <p className="font-bold leading-tight">{children}</p>
    </div>
)

const H1 = ({className, children}: {className?: string, children: ReactNode}) => (
    <h1 className={classNames("text-4xl font-bold mb-4", className)}>
        {children}
    </h1>
)

const Website = ({className, href, img}: {className?: string, href: string, img: string}) => (
    <a href={href} className={classNames("block transform hover:scale-105 transition", className)}>
        <img src={img} className="rounded-lg"/>
    </a>
)
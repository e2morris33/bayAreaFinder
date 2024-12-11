// map dimensions
const mapWidth = 948;
const mapHeight = 844;

// These are the extent of our datapoints, coordinates-wise
const longitudeRange = [-121.781739849809, -122.50685];
const latitudeRange = [37.22070801115405, 37.820673];

// define the bounding box of the coordinates
const mapFrameGeoJSON = {
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [
      [longitudeRange[0], latitudeRange[0]],
      [longitudeRange[1], latitudeRange[1]],
    ],
  },
};

// Projection for converting geo-coordinates to pixel coordinates
const projection = d3
  .geoConicConformal()
  .parallels([37 + 4 / 60, 38 + 26 / 60])
  .rotate([120 + 30 / 60], 0)
  .fitSize([mapWidth, mapHeight], mapFrameGeoJSON);

// Create an SVG container
var container = d3.select("#mapContainer");
var svg = container
  .append("svg")
  .attr("width", mapWidth)
  .attr("height", mapHeight)
  .style("border", "1px solid black");

// Add map image
svg
  .append("image")
  .attr("width", mapWidth)
  .attr("height", mapHeight)
  .attr("xlink:href", "map.png");

// Add draggable circles for circleA and circleB
let locA = [-122.409821, 37.808673];
let locB = [-122.409821, 37.408673];
let radiusA = 100;
let radiusB = 100;

// Add draggable circleA
const circleA = svg
  .append("circle")
  .attr("opacity", 0.3)
  .attr("r", radiusA)
  .attr("cx", projection(locA)[0])
  .attr("cy", projection(locA)[1])
  .attr("fill", "#FF9999")
  .attr("stroke", "#FF0000")
  .attr("stroke-width", 2)
  .call(
    d3.drag().on("drag", (event) => {
      locA = projection.invert([event.x, event.y]);
      circleA.attr("cx", event.x).attr("cy", event.y);
      updatePointsInCircle(); // Update when dragging, and color them if they overlap
    })
  );

// Add draggable circleB
const circleB = svg
  .append("circle")
  .attr("opacity", 0.3)
  .attr("r", radiusB)
  .attr("cx", projection(locB)[0])
  .attr("cy", projection(locB)[1])
  .attr("fill", "#FF9999")
  .attr("stroke", "#006400")
  .attr("stroke-width", 2)
  .call(
    d3.drag().on("drag", (event) => {
      locB = projection.invert([event.x, event.y]);
      circleB.attr("cx", event.x).attr("cy", event.y);
      updatePointsInCircle(); // Update when dragging, and color them if they overlap
    })
  );

// Load and plot restaurant data
d3.csv("eatings.csv").then((data) => {
  let allRestaurants = data.map((d) => ({
    name: d.name,
    rating: parseFloat(d.rating),
    price: d.price,
    lon: +d.longitude,
    lat: +d.latitude,
  }));

  // initial plot of restaurant dots
  plotRestaurants(allRestaurants);

  // Event listener for the checkboxes in the filters
  d3.selectAll("input[type=checkbox]").on("change", function () {
    filterRestaurants();
  });

  function filterRestaurants() {
    let selectedRatings = [];
    let selectedPrices = [];

    if (document.getElementById("rating1").checked)
      selectedRatings.push([4.0, 5.0]);
    if (document.getElementById("rating2").checked)
      selectedRatings.push([3.0, 3.99]);
    if (document.getElementById("rating3").checked)
      selectedRatings.push([2.0, 2.99]);
    if (document.getElementById("rating4").checked)
      selectedRatings.push([1.0, 1.99]);

    if (document.getElementById("price1").checked) selectedPrices.push("$");
    if (document.getElementById("price2").checked) selectedPrices.push("$$");
    if (document.getElementById("price3").checked) selectedPrices.push("$$$");
    if (document.getElementById("price4").checked) selectedPrices.push("$$$$");

    // filter restaurants based on rating and price
    const filteredRestaurants = allRestaurants.filter((d) => {
      const matchesRating =
        selectedRatings.length === 0 ||
        selectedRatings.some(
          ([min, max]) => d.rating >= min && d.rating <= max
        );
      const matchesPrice =
        selectedPrices.length === 0 || selectedPrices.includes(d.price);
      return matchesRating && matchesPrice;
    });

    // re-plot filtered restaurants
    plotRestaurants(filteredRestaurants);
  }

  function plotRestaurants(filteredData) {
    svg.selectAll("circle.restaurants").remove(); // first remove the ones that are there

    const restaurantCircles = svg
      .selectAll("circle.restaurants")
      .data(filteredData)
      .enter()
      .append("circle")
      .attr("class", "restaurants")
      .attr("cx", (d) => projection([d.lon, d.lat])[0])
      .attr("cy", (d) => projection([d.lon, d.lat])[1])
      .attr("r", 5)
      .attr("fill", "#808080") // Default color
      .attr("stroke", "none")
      .attr("opacity", 0.7);

    restaurantCircles
      .on("mouseover", function (event, d) {
        d3.select("#hoverRestaurantName").text(`Restaurant Name: ${d.name}`);
        d3.select("#hoverRestaurantRating").text(
          `Rating: ${d.rating || "N/A"}`
        );
      })
      .on("mouseout", function () {
        d3.select("#hoverRestaurantName").text("Restaurant Name: --");
        d3.select("#hoverRestaurantRating").text("Rating: --");
      });

    updatePointsInCircle();
  }
});

// Function used to check if a point lies inside a circle
function pointInCircle(x, y, circleElem) {
  const cx = +circleElem.attr("cx");
  const cy = +circleElem.attr("cy");
  const r = +circleElem.attr("r");
  const distance = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
  return distance < r;
}

// Function used to handle circle overlap highlighting
function updatePointsInCircle() {
  svg.selectAll("circle.restaurants").each(function () {
    const thisCircle = d3.select(this);
    const xVal = +thisCircle.attr("cx");
    const yVal = +thisCircle.attr("cy");

    const inBothCircles =
      pointInCircle(xVal, yVal, circleA) && pointInCircle(xVal, yVal, circleB);

    thisCircle
      .attr("fill", inBothCircles ? "#3F51B5" : "#808080")
      .classed("highlighted", inBothCircles);
  });
}

// Slider interaction for circle radius adjustments
const radiusASlider = document.getElementById("radiusASlider");
const radiusBSlider = document.getElementById("radiusBSlider");
const radiusALabel = document.getElementById("radiusALabel");
const radiusBLabel = document.getElementById("radiusBLabel");

radiusASlider.addEventListener("input", function () {
  radiusA = +this.value;
  radiusALabel.textContent = radiusA;
  circleA.attr("r", radiusA);
  updatePointsInCircle();
});

radiusBSlider.addEventListener("input", function () {
  radiusB = +this.value;
  radiusBLabel.textContent = radiusB;
  circleB.attr("r", radiusB);
  updatePointsInCircle();
});

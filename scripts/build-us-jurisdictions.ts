import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const jurisdictions: Array<[string, string, string[]]> = [
  ["Alabama", "AL", ["Birmingham", "Montgomery", "Mobile"]],
  ["Alaska", "AK", ["Anchorage", "Fairbanks", "Juneau"]],
  ["Arizona", "AZ", ["Phoenix", "Tucson", "Flagstaff"]],
  ["Arkansas", "AR", ["Little Rock", "Fayetteville", "Fort Smith"]],
  ["California", "CA", ["Los Angeles", "San Francisco", "Sacramento", "San Diego"]],
  ["Colorado", "CO", ["Denver", "Colorado Springs", "Fort Collins"]],
  ["Connecticut", "CT", ["Hartford", "New Haven", "Stamford"]],
  ["Delaware", "DE", ["Wilmington", "Dover", "Newark"]],
  ["District of Columbia", "DC", ["Washington"]],
  ["Florida", "FL", ["Miami", "Orlando", "Tampa", "Jacksonville"]],
  ["Georgia", "GA", ["Atlanta", "Augusta", "Savannah"]],
  ["Hawaii", "HI", ["Honolulu", "Hilo", "Kailua"]],
  ["Idaho", "ID", ["Boise", "Idaho Falls", "Twin Falls"]],
  ["Illinois", "IL", ["Chicago", "Springfield", "Peoria"]],
  ["Indiana", "IN", ["Indianapolis", "Fort Wayne", "South Bend"]],
  ["Iowa", "IA", ["Des Moines", "Cedar Rapids", "Iowa City"]],
  ["Kansas", "KS", ["Wichita", "Topeka", "Kansas City"]],
  ["Kentucky", "KY", ["Louisville", "Lexington", "Frankfort"]],
  ["Louisiana", "LA", ["New Orleans", "Baton Rouge", "Shreveport"]],
  ["Maine", "ME", ["Portland", "Augusta", "Bangor"]],
  ["Maryland", "MD", ["Baltimore", "Annapolis", "Frederick"]],
  ["Massachusetts", "MA", ["Boston", "Worcester", "Springfield"]],
  ["Michigan", "MI", ["Detroit", "Lansing", "Grand Rapids"]],
  ["Minnesota", "MN", ["Minneapolis", "Saint Paul", "Duluth"]],
  ["Mississippi", "MS", ["Jackson", "Gulfport", "Hattiesburg"]],
  ["Missouri", "MO", ["Kansas City", "St. Louis", "Springfield"]],
  ["Montana", "MT", ["Billings", "Missoula", "Helena"]],
  ["Nebraska", "NE", ["Omaha", "Lincoln", "Grand Island"]],
  ["Nevada", "NV", ["Las Vegas", "Reno", "Carson City"]],
  ["New Hampshire", "NH", ["Manchester", "Concord", "Nashua"]],
  ["New Jersey", "NJ", ["Newark", "Trenton", "Jersey City"]],
  ["New Mexico", "NM", ["Albuquerque", "Santa Fe", "Las Cruces"]],
  ["New York", "NY", ["New York", "Albany", "Buffalo"]],
  ["North Carolina", "NC", ["Charlotte", "Raleigh", "Durham"]],
  ["North Dakota", "ND", ["Fargo", "Bismarck", "Grand Forks"]],
  ["Ohio", "OH", ["Columbus", "Cleveland", "Cincinnati"]],
  ["Oklahoma", "OK", ["Oklahoma City", "Tulsa", "Norman"]],
  ["Oregon", "OR", ["Portland", "Salem", "Eugene"]],
  ["Pennsylvania", "PA", ["Philadelphia", "Pittsburgh", "Harrisburg"]],
  ["Rhode Island", "RI", ["Providence", "Warwick", "Cranston"]],
  ["South Carolina", "SC", ["Charleston", "Columbia", "Greenville"]],
  ["South Dakota", "SD", ["Sioux Falls", "Rapid City", "Pierre"]],
  ["Tennessee", "TN", ["Nashville", "Memphis", "Knoxville"]],
  ["Texas", "TX", ["Houston", "Dallas", "Austin", "San Antonio"]],
  ["Utah", "UT", ["Salt Lake City", "Provo", "St. George"]],
  ["Vermont", "VT", ["Burlington", "Montpelier", "Rutland"]],
  ["Virginia", "VA", ["Richmond", "Norfolk", "Virginia Beach"]],
  ["Washington", "WA", ["Seattle", "Spokane", "Olympia"]],
  ["West Virginia", "WV", ["Charleston", "Morgantown", "Huntington"]],
  ["Wisconsin", "WI", ["Milwaukee", "Madison", "Green Bay"]],
  ["Wyoming", "WY", ["Cheyenne", "Casper", "Laramie"]],
  ["Puerto Rico", "PR", ["San Juan", "Ponce", "Mayaguez"]],
  ["Guam", "GU", ["Hagatna", "Dededo", "Tamuning"]],
  ["U.S. Virgin Islands", "VI", ["Charlotte Amalie", "Christiansted", "Cruz Bay"]],
  ["American Samoa", "AS", ["Pago Pago", "Tafuna", "Fagatogo"]],
  ["Northern Mariana Islands", "MP", ["Saipan", "Tinian", "Rota"]]
];

const records = jurisdictions.map(([name, abbreviation, majorCities]) => ({
  name,
  abbreviation,
  majorCities,
  stateHealthDepartmentSearchTerms: [
    `"hantavirus" "2026" "${name}"`,
    `"hantavirus pulmonary syndrome" "2026" "${name}"`,
    `"hantavirus" "confirmed case" "2026" "${name}"`,
    `"hantavirus" "death" "2026" "${name}"`,
    `"hantavirus" "health department" "2026" "${name}"`,
    `"hantavirus" "county" "2026" "${name}"`
  ],
  localNewsSearchTerms: [
    `"hantavirus" "hospital" "2026" "${name}"`,
    `"hantavirus" "monitoring" "2026" "${name}"`,
    `"hantavirus" "quarantine" "2026" "${name}"`,
    `"hantavirus" "treated" "2026" "${name}"`,
    ...majorCities.map((city) => `"hantavirus" "2026" "${city}"`)
  ]
}));

await writeFile(join(process.cwd(), "data", "us-jurisdictions.json"), `${JSON.stringify(records, null, 2)}\n`);

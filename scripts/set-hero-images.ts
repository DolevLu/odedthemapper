import { prisma } from "../src/lib/prisma";

const HERO_IMAGES: Record<string, string> = {
  italy: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/3840px-Colosseo_2020.jpg",
  prague: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg/3840px-Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg",
  japan: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg/3840px-View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg",
  copenhagen: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/The_Nyhavn_Canal_3.jpg/3840px-The_Nyhavn_Canal_3.jpg",
  budapest: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg/3840px-Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg",
  thailand: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg/3840px-%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg",
  china: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/3840px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg",
  vietnam: "https://upload.wikimedia.org/wikipedia/commons/7/79/Ha_Long_Bay_in_2019.jpg",
  poland: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Sukiennice_and_Main_Market_Square_Krakow_Poland.JPG/3840px-Sukiennice_and_Main_Market_Square_Krakow_Poland.JPG",
  usa: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Golden_Gate_Bridge_as_seen_from_Battery_East.jpg/3840px-Golden_Gate_Bridge_as_seen_from_Battery_East.jpg",
  laos: "https://upload.wikimedia.org/wikipedia/commons/3/3a/The_river_of_Kuang_si_waterfalls.jpg",
  cambodia: "https://upload.wikimedia.org/wikipedia/commons/4/41/Angkor_Wat.jpg",
  sweden: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Gamla_stan_September_2014_01.jpg/3840px-Gamla_stan_September_2014_01.jpg",
  dubai: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg/3840px-Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg",
  england: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Tower_Bridge_at_Dawn.jpg/3840px-Tower_Bridge_at_Dawn.jpg",
  netherlands: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/26Y_1599_2.jpg/3840px-26Y_1599_2.jpg",
  tanzania: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Kilimanjaro_from_Amboseli.jpg",
  greece: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Oia_sunset_-_panoramio_%282%29.jpg/3840px-Oia_sunset_-_panoramio_%282%29.jpg",
  norway: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Geirangerfjord_.jpg/3840px-Geirangerfjord_.jpg",
  singapore: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Supertree_Grove%2C_Gardens_by_the_Bay%2C_Singapore_-_20120712-02.jpg/3840px-Supertree_Grove%2C_Gardens_by_the_Bay%2C_Singapore_-_20120712-02.jpg",
  spain: "https://upload.wikimedia.org/wikipedia/commons/e/ef/SF_maig_2_cropped.jpg",
  portugal: "https://upload.wikimedia.org/wikipedia/commons/7/74/Sintra_Portugal_Pal%C3%A1cio_da_Pena-01.jpg",
  france: "https://upload.wikimedia.org/wikipedia/commons/2/29/MG-Paris-Champ_de_Mars.jpg",
  korea: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/%EA%B4%91%ED%99%94%EB%AC%B8_%EC%9B%94%EB%8C%80.jpg/3840px-%EA%B4%91%ED%99%94%EB%AC%B8_%EC%9B%94%EB%8C%80.jpg",
  cyprus: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Roca_de_Afrodita%2C_Chipre%2C_2021-12-10%2C_DD_65.jpg/3840px-Roca_de_Afrodita%2C_Chipre%2C_2021-12-10%2C_DD_65.jpg",
  croatia: "https://upload.wikimedia.org/wikipedia/commons/6/67/The_walls_of_the_fortress_and_View_of_the_old_city._panorama.jpg",
  romania: "https://upload.wikimedia.org/wikipedia/commons/1/17/Castelul_Bran2.jpg",
  argentina: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Perito_Moreno_Glacier_2023.jpg/3840px-Perito_Moreno_Glacier_2023.jpg",
  austria: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Hallstatt_-_Zentrum_.JPG/3840px-Hallstatt_-_Zentrum_.JPG",
  philippines: "https://upload.wikimedia.org/wikipedia/commons/a/af/Chocolate_Hills_Bohol.JPG",
};

async function main() {
  for (const [slug, url] of Object.entries(HERO_IMAGES)) {
    await prisma.destination.update({ where: { slug }, data: { heroImage: url } }).catch((err) => {
      console.error(`Failed for ${slug}:`, err.message);
    });
  }
  console.log(`Set hero images for ${Object.keys(HERO_IMAGES).length} destinations.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

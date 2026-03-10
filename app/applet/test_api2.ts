import axios from "axios";

async function test() {
  try {
    const res = await axios.get("https://api.openf1.org/v1/car_data?driver_number=1&session_key=9158&limit=1000");
    console.log("Success, length:", res.data.length);
  } catch (err: any) {
    console.error("Error:", err.response ? err.response.status : err.message);
  }
}
test();

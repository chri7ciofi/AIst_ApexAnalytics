import axios from "axios";

async function test() {
  try {
    const sessionKey = 9158;
    const driver1 = 1;
    const driver2 = 16;
    
    const url1 = `http://localhost:3000/api/openf1/car_data?driver_number=${driver1}&session_key=${sessionKey}&date>=2023-09-15T10:08:49.194000+00:00&date<=2023-09-15T10:10:22.670Z`;
    const url2 = `http://localhost:3000/api/openf1/car_data?driver_number=${driver2}&session_key=${sessionKey}&date>=2023-09-15T10:08:11.538000+00:00&date<=2023-09-15T10:09:44.888Z`;
    
    const [res1, res2] = await Promise.all([
      axios.get(url1),
      axios.get(url2)
    ]);
    
    console.log("res1", res1.data.length);
    console.log("res2", res2.data.length);
    
  } catch (err: any) {
    console.error("Error:", err.response ? err.response.status : err.message, err.response?.data);
  }
}
test();

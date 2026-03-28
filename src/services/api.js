import axios from "axios";

const API = axios.create({
  baseURL: "http://172.25.13.251:3000", 
});

export default API;
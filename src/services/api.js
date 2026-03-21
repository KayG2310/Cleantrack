import axios from "axios";

const API = axios.create({
  baseURL: "http://10.183.61.96:3000", 
});

export default API;
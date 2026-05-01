### osrm-extract
docker run -t --rm `
  -v "${PWD}:/data" `
  osrm/osrm-backend:latest `
  osrm-extract -p /opt/foot.lua /data/bashkortostan_republic.pbf

### osrm-partition
docker run -t --rm `
  -v "${PWD}:/data" `
  osrm/osrm-backend:latest `
  osrm-partition /data/bashkortostan_republic.osrm

### osrm-customize
docker run -t --rm `
  -v "${PWD}:/data" `
  osrm/osrm-backend:latest `
  osrm-customize /data/bashkortostan_republic.osrm
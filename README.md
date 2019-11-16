<!--[![Github All Releases](https://img.shields.io/github/downloads/korelkashri/VersionsTrack/total.svg)]()-->

# Versions Track
Web-based application for release versions management.

## Description
Interactive web-based application to control issues & features, alongside development.
Mark and remember old issues with versions/dates/description oriented search.

**Compatible with offline systems.**

## Dependencies
* [node.js](https://nodejs.org/en/).
* [mongodb](https://www.mongodb.com/).

## Run
```
sudo service mongod start # make sure to start mongodb sevice
node ./app.js
```

### Access Server
```
# On browser [chrome recommanded]: localhost:5000
```

## Features
* Versions basic identifires: Previous version id, This version id (e.g. From: 3.0.0 To: 3.0.1)
* Version properties: Unique changes that applied in specific version (e.g. Features, Solved Bugs, etc..)
* Easy to use web-based interface, designed with [MaterializeCSS](https://materializecss.com/)
* Versions search by version-id, version release date, and versions/properties descriptions.
* Compatible with offline systems.
* Cross-Platform application.

## Pictures
### Versions Overview
![Version Overview](./docs/images/VersionsTrack-11.png)

### Search section
![Search section](./docs/images/VersionsTrack-12-Search.png)

### Add new version
![Add new version](./docs/images/VersionsTrack-13-NewVersion.png)

### Modify version
![Modify version](./docs/images/VersionsTrack-14-ModifyVersion.png)

### Modify version's property
![Modify version's property](./docs/images/VersionsTrack-15-ModifyProperty.png)

### TODO
* *~~Add property option.~~* :heavy_check_mark:
* *~~Version adding option~~* :heavy_check_mark:
* *~~Version modifying option~~* :heavy_check_mark:
* *~~Version deleting option~~* :heavy_check_mark:
* Order properties by type/tests scope.
* *~~Add search by descriptions keywords (versions & properties).~~* :heavy_check_mark:
* Add generic description options for versions.
* *~~Click on version will automatically search it.~~* :heavy_check_mark:
* *~~Limit versions count in a page.~~* :heavy_check_mark:
* *~~Limit properties count in a page.~~* :heavy_check_mark:
* Properties/Versions short description TAGs.

#### Next
* Add users privileges.
* Add admin panel.
    * Users control panel
    * Background change option.

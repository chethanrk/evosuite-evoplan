# README #

EvoPlan is a online app for assigning demands to a user or resource group.
You can assign, reassign demands alo show up assignments in a planning calender.
Change status of demands and edit assignments.

### What is this repository for? ###

* EvoPlan is based on SapUI5 and works only online

### How do I get set up? ###

* If not already installed install [NodeJs](https://nodejs.org/en/)
* start console in project folder and install node modules with <code>npm install</code>
* after that you can start index.html

### Contribution guidelines ###

* create for every ticket you are working on a seperate branch
* When you haved merged your branch in the master use grunt for generate the Component-preload.js
* Also generate and commit Component-preload.js with every master commit
* When you change something on **i18n_en.properties** you do not have to copy everything to **i18n.properties**. Just use grunt command before commit your changes.

### Using Grunt ###

* There are two tasks in Gruntfile registered, just start console in project folder and execute <code>grunt</code>
* Command <code>grunt</code> is default and will execute all registered tasks in script
* Command <code>grunt minimize</code> will generate **Component-preload.js** from all js and xml files
* Command <code>grunt copy-lang</code> will copy **i18n/i18n_en.properties** to **i18n/i18n.properties**
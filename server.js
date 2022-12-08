// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, 'db', 'ec.db'); // <-- change this

let app = express();
let port = 8000;

// Open SQLite3 database (in read-only mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Serve static files from 'public' directory
app.use(express.static(public_dir));


// GET request handler for home page '/' (redirect to desired route)
app.get('/', (req, res) => {
    res.redirect('/home');
});

//HOMEPAGE
app.get('/home', (req, res) => {
    fs.readFile(path.join(template_dir, 'index.html'), 'utf-8', (err, page) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        if(err){
            res.status(404).send("Error: File Not Found");
        }
        else { 
            res.status(200).type('html').send(page);
        }
    });
});

// default energy page
app.get('/energy/', (req, res) => {
    res.redirect('/energy/coal');
});

//ENERGY.HTML
//URL SHOULD LOOK LIKE localhost:8000/energy/coal
app.get('/energy/:energytype', (req, res) => {
    console.log(req.params.energytype);

    let energy_page = path.join(template_dir,'energy.html');
    let energy_type = req.params.energytype.toLowerCase();

    let energy_pairs = {"coal": "Coal (Short Tons)", "geothermal": "Geothermal (Billion Btu)", "naturalgas": "Natural Gas (Mcf)", "othergas" : "Other Gases (Billion Btu)", "petroleum" : "Petroleum (Barrels)"};

    let energys = ["coal", "geothermal", "naturalgas", "othergas", "petroleum"];

    if(!energy_pairs.hasOwnProperty(energy_type)) {

        let message = "Error: no data for energy type " + energy_type;
        res.status(404).type('txt').send(message);

    } else {

        fs.readFile(energy_page,(err,data)=>{

            // console.log(data);
            let response = data.toString();
            //Filling in Main Stuff 
            let query = 'SELECT * FROM "energy-consumption" WHERE type = "Total Electric Power Industry" and energy = ?';
    
            db.all(query, [energy_pairs[energy_type]], (err, rows) =>{

                    // console.log(rows[0]);
                    response = response.replaceAll('%%ENERGY_IMAGE%%', '/images/energy/' + req.params.energytype + '_logo.jpg');
                    response = response.replaceAll("%%ENERGY_ALT_TEXT%%", rows[0].energy + " highlighted on an image.");
                    response = response.replaceAll("%%DATANAME%%", rows[0].energy);

                    energy_index = energys.indexOf(req.params.energytype);
                    if (energy_index == 0) {
                        response = response.replaceAll("%%PREVIOUS%%", "/energy/" + energys[energys.length - 1].toLowerCase());
                        response = response.replaceAll("%%NEXT%%", "/energy/" + energys[energy_index + 1].toLowerCase());
                    } else if (energy_index == energys.length - 1) {
                        response = response.replaceAll("%%PREVIOUS%%", "/energy/" + energys[energy_index - 1].toLowerCase());
                        response = response.replaceAll("%%NEXT%%", "/energy/" + energys[0].toLowerCase());
                    } else {
                        response = response.replaceAll("%%PREVIOUS%%", "/energy/" + energys[energy_index - 1].toLowerCase());
                        response = response.replaceAll("%%NEXT%%", "/energy/" + energys[energy_index + 1].toLowerCase());
                    }
    
                    let table = "";
                    for(let i =0; i<rows.length; i++){
                        let year = rows[i].year;
                        let state = rows[i].state;
                        let type = rows[i].type;
                        let consumption = rows[i].consumption;
                        let newRow = "";
    
                        newRow += "<tr><td>" + year + "</td><td>" + state + "</td><td>" + consumption + "</td></tr>";
                        table += newRow;
                    }
                    response = response.replace("%%DATA%%",table)


                    //GETTING DATA FOR GRAPHS    
                    let years_list = [];
                    //let state = rows[0].state;
                    let energy_source_totals = [];

                    for(let i =0; i<rows.length;i++){
                        if(!years_list.includes(rows[i].year)){
                            years_list.push(rows[i].year)
                        }
                        if(rows[i].state === 'US-TOTAL' || rows[i].state === 'US-Total'){
                            
                            energy_source_totals.push(rows[i].consumption);
                        }
                    }
                    
                    energy_source_totals = '['+energy_source_totals+"]";
                    years_list = '['+years_list+']';

                    response = response.replace("%%ENERGYTOTAL%%", energy_source_totals);
                    response = response.replace("%%YEARSLIST%%", years_list);
    
                    res.status(200).type('html').send(response);
            })
        })

    }
});

// default state page
app.get('/state/', (req, res) => {
    res.redirect('/state/mn');
});

//STATE.HTML
//URL SHOULD LOOK LIKE localhost:8000/state/mn
app.get('/state/:statename', (req, res) => {
    console.log(req.params.statename);
    let state_page = path.join(template_dir,'state.html');
    let state_name = req.params.statename.toUpperCase();

    let states = ["AK", "AL", "AR", "AS", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "GU", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "PR", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VI", "VT", "WA", "WI", "WV", "WY"];

    if(!states.includes(state_name)) {

        let message = "Error: no data for state " + state_name;
        res.status(404).type('txt').send(message);

    } else {

        fs.readFile(state_page,(err,data)=>{
            // console.log(data);
            let response = data.toString();
            //Filling in Main Stuff 
            let query = 'SELECT * FROM "energy-consumption" WHERE type = "Total Electric Power Industry" and state=?';
            
            db.all(query,[state_name], (err, rows) =>{

                    // console.log(rows[0]);
                    response = response.replaceAll('%%STATE_IMAGE%%', '/images/state/' + state_name + '_logo.jpg');
                    response = response.replaceAll("%%STATE_ALT_TEXT%%", state_name + " highlighted on a map.");
                    response = response.replaceAll("%%DATANAME%%", state_name);

                    state_index = states.indexOf(state_name);
                    if (state_index == 0) {
                        response = response.replaceAll("%%PREVIOUS%%", "/state/" + states[states.length - 1].toLowerCase());
                        response = response.replaceAll("%%NEXT%%", "/state/" + states[state_index + 1].toLowerCase());
                    } else if (state_index == states.length - 1) {
                        response = response.replaceAll("%%PREVIOUS%%", "/state/" + states[state_index - 1].toLowerCase());
                        response = response.replaceAll("%%NEXT%%", "/state/" + states[0].toLowerCase());
                    } else {
                        response = response.replaceAll("%%PREVIOUS%%", "/state/" + states[state_index - 1].toLowerCase());
                        response = response.replaceAll("%%NEXT%%", "/state/" + states[state_index + 1].toLowerCase());
                    }

                    let table = "";
                    let years_list = [];
                    let year_dict = {};
                    for(let i =0; i<rows.length; i++){
                        if(!years_list.includes(rows[i].year)){
                            years_list.push(rows[i].year)
                        }

                        let year = rows[i].year;
                        let type = rows[i].type;
                        let energy = rows[i].energy;
                        let consumption = rows[i].consumption;
                        let newRow = "";

                        newRow += "<tr><td>" + year + "</td><td>" + energy + "</td><td>" + consumption + "</td></tr>";
                        table += newRow;
                    
                    }
                    response = response.replace("%%DATA%%",table);
                    response = response.replace("%%STATE_IMG%%", "/images/state/usatest.png");


                    //GETTING DATA FOR GRAPHS
                    //let state = rows[0].state;
                    let coal_year_total = Array.apply(null, Array(32)).map(Number.prototype.valueOf,0);
                    let petrol_year_total = Array.apply(null, Array(32)).map(Number.prototype.valueOf,0);
                    let natgas_year_total = Array.apply(null, Array(32)).map(Number.prototype.valueOf,0);
                    let othergas_year_total = Array.apply(null, Array(32)).map(Number.prototype.valueOf,0);
                    let geo_year_total = Array.apply(null, Array(32)).map(Number.prototype.valueOf,0);

                    for(let i =0; i<rows.length;i++){
                        if(rows[i].energy == 'Coal (Short Tons)' && years_list.includes(rows[i].year)) {
                            let year_index = years_list.indexOf(rows[i].year)
                            if(typeof(rows[i].consumption) != 'number'){
                                continue
                            }else{
                            coal_year_total[year_index] = rows[i].consumption;
                            }
                        }

                        if(rows[i].energy == "Petroleum (Barrels)" && years_list.includes(rows[i].year)){
                            let year_index = years_list.indexOf(rows[i].year)
                            if(typeof(rows[i].consumption) != 'number'){
                                continue
                            }else{
                            petrol_year_total[year_index] = rows[i].consumption;
                            }
                        }

                        if(rows[i].energy == "Natural Gas (Mcf)" && years_list.includes(rows[i].year) ){
                            let year_index = years_list.indexOf(rows[i].year)
                            if(typeof(rows[i].consumption) != 'number'){
                                continue
                            }else{
                            natgas_year_total[year_index] = rows[i].consumption;
                            }
                        }

                        if(rows[i].energy == "Other Gases (Billion Btu)" && years_list.includes(rows[i].year)){
                            let year_index = years_list.indexOf(rows[i].year)
                            if(typeof(rows[i].consumption) != 'number'){
                                continue
                            }else{
                                othergas_year_total[year_index] = rows[i].consumption;
                            }
                        }
                        if(rows[i].energy == "Geothermal (Billion Btu)" && years_list.includes(rows[i].year)){
                            let year_index = years_list.indexOf(rows[i].year)
                            if(typeof(rows[i].consumption) != 'number'){
                                continue
                            }else{
                            geo_year_total[year_index] = rows[i].consumption;
                            }
                        }

                    }

                    coal_year_total = '['+coal_year_total+']';
                    petrol_year_total = '['+petrol_year_total+']';
                    natgas_year_total = '['+natgas_year_total+']';
                    othergas_year_total = '['+othergas_year_total+']';
                    geo_year_total = '['+geo_year_total+']';
                    years_list = '['+years_list+']';
                    response = response.replace("%%COALTOTAL%%", coal_year_total);
                    response = response.replace("%%PETROLTOTAL%%", petrol_year_total);
                    response = response.replace("%%NATGASTOTAL%%", natgas_year_total);
                    response = response.replace("%%OTHERGASTOTAL%%", othergas_year_total);
                    response = response.replace("%%GEOTOTAL%%",geo_year_total);
                    response = response.replace("%%YEARSLIST%%", years_list);



                    res.status(200).type('html').send(response);
            })
        })
    }
});

// default year page
app.get('/year/', (req, res) => {
    res.redirect('/year/2021');
});

//YEAR.HTML
//URL SHOULD LOOK LIKE localhost:8000/years/2005
app.get('/year/:year', (req, res) => {
    console.log(req.params.year);
    let year_page = path.join(template_dir,'year.html');
    let year = req.params.year;

    let years = ["1990", "1991", "1992", "1993", "1994", "1995", "1996", "1997", "1998", "1999", "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021"];

    if(isNaN(parseInt(year)) || parseInt(year) > 2021 || parseInt(year) < 1990) {

        let message = "Error: no data for year " + year;
        res.status(404).type('txt').send(message);

    } else {

        fs.readFile(year_page,(err,data)=>{
            let response = data.toString();
            //Filling in Main Stuff 
            let query = 'SELECT * FROM "energy-consumption" WHERE type = "Total Electric Power Industry" and year=?';
            
            db.all(query,[req.params.year], (err, rows) =>{

                // console.log(rows[0]);
                response = response.replaceAll('%%YEAR_IMAGE%%', '/images/years/' + req.params.year + '_logo.jpg');
                response = response.replaceAll("%%YEAR_ALT_TEXT%%", req.params.year + " highlighted on a timeline.");
                response = response.replaceAll("%%DATANAME%%", req.params.year);

                year_index = years.indexOf(req.params.year);
                    if (year_index == 0) {
                        response = response.replaceAll("%%PREVIOUS%%", "/year/" + years[years.length - 1]);
                        response = response.replaceAll("%%NEXT%%", "/year/" + years[year_index + 1]);
                    } else if (year_index == years.length - 1) {
                        response = response.replaceAll("%%PREVIOUS%%", "/year/" + years[year_index - 1]);
                        response = response.replaceAll("%%NEXT%%", "/year/" + years[0]);
                    } else {
                        response = response.replaceAll("%%PREVIOUS%%", "/year/" + years[year_index - 1]);
                        response = response.replaceAll("%%NEXT%%", "/year/" + years[year_index + 1]);
                    }

                let table = "";
                
                for(let i =0; i<rows.length; i++){
                    let state = rows[i].state;
                    let type = rows[i].type;
                    let energy = rows[i].energy;
                    let consumption = rows[i].consumption;
                    let newRow = "";

                            newRow += "<tr><td>" + state + "</td><td>"  + energy + "</td><td>" + consumption + "</td></tr>";
                            table += newRow;
                        
                }
                response = response.replace("%%DATA%%",table)


                //GETTING DATA FOR GRAPHS
            
                let coal_year_total = 0;
                let petrol_year_total = 0;
                let natgas_year_total = 0;
                let othergas_year_total = 0;
                let geo_year_total = 0;

                for(let i =0; i<rows.length;i++){
                    if(rows[i].energy == 'Coal (Short Tons)'){
                        coal_year_total += rows[i].consumption;
                    }
                    else if(rows[i].energy == "Petroleum (Barrels)"){
                        petrol_year_total += rows[i].consumption;
                    }
                    else if(rows[i].energy == "Natural Gas (Mcf)"){
                        natgas_year_total += rows[i].consumption;
                    }
                    else if(rows[i].energy == "Other Gases (Billion Btu)"){
                        othergas_year_total += rows[i].consumption;
                    }
                    else if(rows[i].energy == "Geothermal (Billion Btu)"){
                        geo_year_total += rows[i].consumption;
                    }
                }
                coal_year_total = ''+coal_year_total;
                petrol_year_total = ''+petrol_year_total;
                natgas_year_total = ''+natgas_year_total;
                othergas_year_total = ''+othergas_year_total;
                geo_year_total = ''+geo_year_total;
                //years_list = '['+years_list+']';

                response = response.replace("%%COALTOTAL%%", coal_year_total);
                response = response.replace("%%PETROLTOTAL%%", petrol_year_total);
                response = response.replace("%%NATGASTOTAL%%", natgas_year_total);
                response = response.replace("%%OTHERGASTOTAL%%", othergas_year_total);
                response = response.replace("%%GEOTOTAL%%", geo_year_total);

                res.status(200).type('html').send(response);
            })
        })
    }  
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});

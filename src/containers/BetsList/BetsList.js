import React, { Component } from 'react';
import { connect } from 'react-redux';

import Bet from './Bet';

import { betdeex, categoryArray, subCategoryArray } from '../../env.js';
import provider from '../../ethereum/provider';

const ethers = require('ethers');

class BetsList extends Component {
  state = {
    betsToDisplay: []
  }

  componentDidMount = () => {
    this.showBets();
  }

  componentDidUpdate = prevProps => {
    if (this.props.categoryId !== prevProps.categoryId || this.props.subCategoryId !== prevProps.subCategoryId) {
      this.showBets();
    }
  }

  showBets = async () => {
    const newBetEventSig = ethers.utils.id("NewBetContract(address,address,uint8,uint8,string)");
    const topics = [ newBetEventSig, null, null, null ];
    topics[2] = this.props.categoryId !== undefined ?
      '0x'+'0'.repeat(64-this.props.categoryId.toString(16).length)+this.props.categoryId.toString(16)
      : null;
    topics[3] = this.props.categoryId !== undefined ?
      '0x'+'0'.repeat(64-this.props.subCategoryId.toString(16).length)+this.props.subCategoryId.toString(16)
      : null;

    const logs = await provider.getLogs({
      address: betdeex.address,
      fromBlock: 0,
      toBlock: 'latest',
      topics
    });

    console.log('fetching logs from the ethereum blockchain', logs);

    console.log('in showBets',this.props.store);

    if(Object.entries(this.props.store.betsMapping).length === 0) {
      // if redux store is empty then try to copy the local storage if there is any data. otherwise do nothing.
      const storedBetsMapping = JSON.parse(localStorage.getItem('betdeex-betsMapping') || '{}');
      if(Object.entries(storedBetsMapping).length > 0) {
        this.props.dispatch({ type: 'LOAD-BETS-MAPPING-FROM-LOCALSTORAGE', payload: storedBetsMapping });
      }
    }

    let betsArray = [];

    for (let log of logs) {
      const address = '0x'+log.data.slice(26,66);
      const description = ethers.utils.toUtf8String('0x'+log.data.slice(192)).replace(/[^A-Za-z 0-9?]/g, "");
      const categoryId = +log.topics[2];
      const subCategoryId = +log.topics[3];
      //const blockNumber = log.blockNumber;

      betsArray.push(address);

      // storing for reusing it in bet page
      // initialising bet object in our mapping
      if(!this.props.store.betsMapping[address]) {
        this.props.dispatch({
          type: 'UPDATE-BETS-MAPPING-ADDBET',
          payload: {
            address
          }
        });
      }

      this.props.dispatch({
        type: 'UPDATE-BETS-MAPPING-DESCRIPTION',
        payload: {
          address,
          value: description
        }
      });

      this.props.dispatch({
        type: 'UPDATE-BETS-MAPPING-CATEGORY',
        payload: {
          address,
          value: categoryId
        }
      });

      this.props.dispatch({
        type: 'UPDATE-BETS-MAPPING-SUBCATEGORY',
        payload: {
          address,
          value: subCategoryId
        }
      });

    }

    // betsArray.forEach(address => {
    //   if(!this.props.store.betsMapping[address]) {
    //     this.props.dispatch({ type: 'UPDATE-BETS-MAPPING', payload: {
    //       ...this.props.store.betsMapping,
    //       [address]: {}
    //     } });
    //   }
    // });



    this.setState({
      betsToDisplay: betsArray.slice(0,5).map(
        address =>
          <Bet
            key={address}
            address={address}
            description={this.props.store.betsMapping[address].description}
            category={this.props.store.betsMapping[address].categoryId}
            subCategory={this.props.store.betsMapping[address].subCategoryId}
          />
      ) });

    //localStorage.setItem('betdeex-betsArray', betsArray);
    localStorage.setItem('betdeex-betsMapping', JSON.stringify(this.props.store.betsMapping));
  }

  render() {
    return (
      <div>
        Showing 5 bets{console.log(this.props.categoryId !== undefined, this.props.subCategoryId !== undefined)}
        {
          (this.props.categoryId !== undefined
          ? ` of ${categoryArray[this.props.categoryId]}`
          : null)
        +
          (this.props.subCategoryId !== undefined
          ? `/${subCategoryArray[this.props.categoryId][this.props.subCategoryId]}`
          : null)
        }<br />
        {this.state.betsToDisplay}
      </div>
    );
  }
}

export default connect(state => {return{store: state}})(BetsList);

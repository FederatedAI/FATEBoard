import { formatFloat, deepClone } from '../index'
import handleTreeData from './treeDataHandler'
import treeOptions from '@/utils/chart-options/tree'
import treeLineOptions from '@/utils/chart-options/treeLine'
import doubleBarOptions from '@/utils/chart-options/doubleBar'

export default function({ responseData, output, role, partyId }) {
  output.formatObj = responseData
  output.formatString = JSON.stringify(responseData, null, 2)
  const options = deepClone(treeOptions)
  const treesLineData = deepClone(treeLineOptions)
  let treesOverviewData = []
  let lineSeriesData = []
  const { featureNameFidMapping, trees, classes, treeDim } = responseData
  let maxTreeSize = 0
  if (treeDim < 3) {
    trees.forEach((item, index) => {
      treesOverviewData.push(handleTreeData(item.tree, role, partyId, featureNameFidMapping, item.splitMaskdict, item.missingDirMaskdict))
      lineSeriesData.push([index, item.tree.length])
      if (item.tree.length > maxTreeSize) {
        maxTreeSize = item.tree.length
      }
    })
    options.series.data = treesOverviewData[0].data
    output.currentTreeData = {
      id: treesOverviewData[0].data[0].treeid,
      size: treesOverviewData[0].size,
      maxDepth: treesOverviewData[0].maxDepth
    }
    output.maxTreeSize = maxTreeSize
    output.treesOverviewData = treesOverviewData
    treesLineData.series.data = lineSeriesData
    treesLineData.series.markLine.data[0][1].coord[1] = maxTreeSize
    output.treesLineData = treesLineData
    output.treeOptions = options
  } else {
    const classOptions = []
    if (role === 'guest') {
      classes.forEach((item, index) => {
        const label = `${index}: ${item}`
        classOptions.push({ value: index, label })
      })
    } else if (role === 'host') {
      for (let i = 0; i < treeDim; i++) {
        classOptions.push({ value: i, label: i })
      }
    }
    output.classOptions = classOptions
    const allTreesOverviewData = []
    const allTreesLineSeriesData = []
    for (let i = 0; i < treeDim; i++) {
      allTreesOverviewData.push([])
      allTreesLineSeriesData.push([])
    }
    trees.forEach((item, index) => {
      allTreesOverviewData[index % treeDim].push(handleTreeData(item.tree, role, partyId, featureNameFidMapping, item.splitMaskdict, item.missingDirMaskdict))
      allTreesLineSeriesData[index % treeDim].push([Number.parseInt(index / treeDim), item.tree.length])
    })
    output.allTreesOverviewData = allTreesOverviewData
    output.allTreesLineSeriesData = allTreesLineSeriesData

    treesOverviewData = allTreesOverviewData[0]
    lineSeriesData = allTreesLineSeriesData[0]
    allTreesLineSeriesData[0].forEach(item => {
      if (item[1] > maxTreeSize) {
        maxTreeSize = item[1]
      }
    })
    options.series.data = treesOverviewData[0].data
    output.currentTreeData = {
      id: treesOverviewData[0].data[0].treeid,
      size: treesOverviewData[0].size,
      maxDepth: treesOverviewData[0].maxDepth
    }
    output.treesOverviewData = treesOverviewData
    treesLineData.series.data = lineSeriesData
    treesLineData.series.markLine.data[0][1].coord[1] = maxTreeSize
    output.maxTreeSize = maxTreeSize
    output.treesLineData = treesLineData
    output.treeOptions = options
  }

  // variable importance
  if (responseData.featureImportances && responseData.featureImportances.length > 0) {
    const variableImportanceOptions = deepClone(doubleBarOptions)
    const importanceData = []
    let variableData = []
    const maxImportanceData = []
    const siteNameData = []
    const featureNameFidMapping = responseData.featureNameFidMapping
    responseData.featureImportances.forEach(item => {
      importanceData.push(item.importance)
      const itemRole = item.sitename.split(':')[0]
      const itemPartyId = item.sitename.split(':')[1]
      // console.log(itemRole, itemPartyId, role, partyId)
      if (itemRole === role && itemPartyId === partyId) {
        variableData.push(featureNameFidMapping[item.fid])
      } else {
        variableData.push(item.fid.toString())
      }
      siteNameData.push(item.sitename)
    })
    const maxImportance = importanceData.reduce((a, b) => b > a ? b : a)
    let maxVariableLength = 0
    variableData.forEach(item => {
      const length = item ? item.toString().length : (typeof item).length
      if (length > maxVariableLength) {
        maxVariableLength = length
      }
    })
    // console.log(maxVariableLength) // 9(undefined)
    variableData = variableData.map(item => {
      if (!item) {
        item = typeof item
      }
      return item.toString().padEnd(maxVariableLength, '  ')
    })
    responseData.featureImportances.forEach((item, index) => {
      maxImportanceData.push(maxImportance)
    })
    variableImportanceOptions.series[0].data = maxImportanceData
    variableImportanceOptions.series[1].data = importanceData.reverse()
    variableImportanceOptions.series[1].name = 'importance'
    variableImportanceOptions.series[0].label.formatter = function(params) {
      return formatFloat(importanceData[params.dataIndex])
    }
    variableImportanceOptions.yAxis[0].data = variableData.reverse()
    variableImportanceOptions.yAxis[1].data = siteNameData.reverse()
    output.variableImportanceOptions = variableImportanceOptions
  }

  if (responseData.featureImportances && responseData.featureImportances.length > 0) {
    const tBody = JSON.parse(JSON.stringify(responseData.featureImportances))
    for (const val of tBody) {
      val.name = responseData.featureNameFidMapping[val.fid]
    }
    output.featureTable = { tBody }
  }

  if (responseData.featureNameFidMapping && Object.keys(responseData.featureNameFidMapping).length > 0) {
    const final = JSON.parse(JSON.stringify(responseData.featureNameFidMapping))
    const tBody = []
    const tHeader = [{ label: 'feature_index', prop: 'featureIndex' }, { label: 'variable', prop: 'variable' }]
    for (const key in final) {
      tBody.push({ variable: final[key], featureIndex: key })
    }
    output.featureHostTable = { tHeader, tBody }
  }
}

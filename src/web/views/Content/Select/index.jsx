import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Modal, Button, Radio, OverlayTrigger, Tooltip, Panel, Well } from 'react-bootstrap'
import Select from 'react-select'
import axios from 'axios'
import classnames from 'classnames'

import CreateOrEditModal from '../modal'
import { fetchContentItemsRecent, fetchContentItemsCount, fetchContentCategories, upsertContentItems } from '~/actions'
import { moveCursorToEnd } from '~/util'

const style = require('./style.scss')

const SEARCH_RESULTS_LIMIT = 5

class SelectContent extends Component {
  state = {
    show: false,
    category: null,
    searchTerm: '',
    contentToEdit: null,
    activeItemIndex: 0
  }

  constructor(props) {
    super(props)

    window.botpress = window.botpress || {}
    window.botpress.pickContent = (options = {}, callback) => {
      this.searchContentItems()
      this.props.fetchContentItemsCount()
      this.props.fetchContentCategories()
      this.callback = callback
      this.setState({ show: true, activeItemIndex: 0 })
      setImmediate(() => moveCursorToEnd(this.searchInput))

      window.onkeyup = this.handleChangeActiveItem
    }
  }

  componentWillUnmount() {
    delete window.botpress.pickContent
  }

  searchContentItems() {
    return this.props.fetchContentItemsRecent({
      count: SEARCH_RESULTS_LIMIT,
      searchTerm: this.state.searchTerm
    })
  }

  handleChangeActiveItem = e => {
    const index = this.state.activeItemIndex
    if (e.key === 'ArrowUp') {
      this.setState({ activeItemIndex: index > 0 ? index - 1 : index })
    } else if (e.key === 'ArrowDown') {
      this.setState({ activeItemIndex: index < SEARCH_RESULTS_LIMIT - 1 ? index + 1 : index })
    } else if (e.key === 'Enter') {
      this.handlePick(this.props.contentItems[this.state.activeItemIndex])
    }
  }

  onSearchChange = event => {
    const newSearchTerm = event.target.value
    const { searchTerm } = this.state
    if (newSearchTerm === searchTerm) {
      return
    }
    this.setState({ searchTerm: newSearchTerm }, () => {
      this.searchContentItems().then(() => this.setState({ activeItemIndex: 0 }))
    })
  }

  handleCreate = () => {
    this.props
      .upsertContentItems({ categoryId: this.state.category.id, formData: this.state.contentToEdit })
      .then(() => Promise.all([this.searchContentItems(), this.props.fetchContentItemsCount()]))
      .then(() => this.setState({ category: null, contentToEdit: null }))
  }

  handlePick(item) {
    this.setState({ show: false })
    this.callback(item)
    window.onkeyup = null
  }

  handleFormEdited = data => {
    this.setState({ contentToEdit: data })
  }

  onClose = () => {
    this.setState({ show: false })
    window.onkeyup = null
  }

  render() {
    const schema = (this.state.category || {}).schema || { json: {}, ui: {} }

    return (
      <Modal animation={false} show={this.state.show} onHide={this.onClose} container={document.getElementById('app')}>
        <Modal.Header closeButton>
          <Modal.Title>Pick Content</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            className="form-control"
            placeholder={`Search all content elements (${this.props.itemsCount})`}
            aria-label="Search content elements"
            onChange={this.onSearchChange}
            ref={input => (this.searchInput = input)}
            value={this.state.searchTerm}
          />
          <hr />
          <div className="list-group">
            {this.props.categories.map(category => (
              <a
                href="#"
                onClick={() => this.setState({ category, contentToEdit: {} })}
                className={`list-group-item list-group-item-action ${style.createItem}`}
              >
                Create new {category.title}
              </a>
            ))}
            {this.props.contentItems.map((contentItem, i) => (
              <a
                href="#"
                className={`list-group-item list-group-item-action ${i === this.state.activeItemIndex ? 'active' : ''}`}
                onClick={() => this.handlePick(contentItem)}
              >
                {`[${contentItem.categoryId}] ${contentItem.previewText}`}
              </a>
            ))}
          </div>
        </Modal.Body>

        <CreateOrEditModal
          show={Boolean(this.state.category)}
          schema={schema.json}
          uiSchema={schema.ui}
          handleClose={() => this.setState({ category: null })}
          formData={this.state.contentToEdit}
          handleEdit={this.handleFormEdited}
          handleCreateOrUpdate={this.handleCreate}
        />
      </Modal>
    )
  }
}

const mapStateToProps = state => ({
  contentItems: state.content.recentItems,
  itemsCount: state.content.itemsCount,
  categories: state.content.categories
})

const mapDispatchToProps = {
  fetchContentItemsRecent,
  fetchContentItemsCount,
  fetchContentCategories,
  upsertContentItems
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectContent)
